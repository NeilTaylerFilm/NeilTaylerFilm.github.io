import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export function uploadedPhotos(report, registry, uploadLocked = false) {
  if (uploadLocked) {
    throw new Error(
      'A photo upload is running or was interrupted. Check `.photo-upload.lock` first.',
    );
  }
  if (report.split(/\r?\n/, 1)[0] !== '# Uploaded photos') {
    throw new Error(
      'The latest photo upload is incomplete. Finish or rerun `npm run photos:upload`.',
    );
  }

  const addresses = [
    ...new Set(
      [...report.matchAll(/^Image address: (https:\/\/\S+)\s*$/gm)].map((match) => match[1]),
    ),
  ];
  if (!addresses.length)
    throw new Error('No uploaded photos found. Run `npm run photos:upload` first.');

  const missing = addresses.filter((address) => {
    const photo = registry[address];
    return (
      !Object.hasOwn(registry, address) ||
      !Number.isInteger(photo?.width) ||
      photo.width < 1 ||
      !Number.isInteger(photo?.height) ||
      photo.height < 1
    );
  });
  if (missing.length) {
    throw new Error(
      `${missing.length} uploaded photo(s) are missing dimensions in the image registry. Finish the upload first.`,
    );
  }

  return addresses.map((src) => ({
    src,
    width: registry[src].width,
    height: registry[src].height,
  }));
}

export function slugify(title) {
  return title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function latestPhotoDate(report, filenames) {
  const uploaded = new Set([...report.matchAll(/^## (.+)$/gm)].map((match) => match[1]));
  const names = filenames.filter((filename) => uploaded.has(filename));
  if (!names.length) {
    throw new Error('No photos from the latest upload remain in photo-inbox.');
  }

  const dates = names.map((filename) => {
    const match = filename.match(/(?:^|[^0-9])((?:19|20)\d{2})(\d{2})(\d{2})(?!\d)/);
    if (!match) {
      throw new Error(
        `Could not find the shoot date in ${filename}. Add it as YYYYMMDD, then run photos:upload again.`,
      );
    }

    const date = `${match[1]}-${match[2]}-${match[3]}`;
    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      throw new Error(
        `The date in ${filename} is not a valid calendar date. Correct it, then run photos:upload again.`,
      );
    }
    return date;
  });

  return dates.sort().at(-1);
}

export function photographyPost(title, date, photos) {
  const project = {
    title,
    date,
    category: 'Behind The Scenes',
    draft: true,
    galleryLayout: 'justified',
    coverImage: photos[0].src,
    images: photos.map(({ src, width, height }) => ({
      src,
      width,
      height,
    })),
  };
  return `---\n${JSON.stringify(project, null, 2)}\n---\n\nWrite your introduction here.\n`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1) throw new Error('Usage: npm run photos:new [-- "project title"]');

  const uploadLocked = existsSync(path.join(root, '.photo-upload.lock'));
  const report = await readFile(path.join(root, 'photo-inbox/UPLOAD-RESULTS.md'), 'utf8').catch(
    (error) => {
      if (error.code === 'ENOENT')
        throw new Error('No upload report found. Run `npm run photos:upload` first.');
      throw error;
    },
  );
  const registry = JSON.parse(await readFile(path.join(root, 'src/data/r2-images.json'), 'utf8'));
  const photos = uploadedPhotos(report, registry, uploadLocked);
  const inbox = await readdir(path.join(root, 'photo-inbox'), { withFileTypes: true });
  const filenames = inbox
    .filter((entry) => entry.isFile() && /\.(jpe?g|webp|png|avif|heic|heif)$/i.test(entry.name))
    .map((entry) => entry.name);
  const date = latestPhotoDate(report, filenames);

  let title = args[0]?.trim();
  if (!title) {
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    try {
      title = (await prompt.question('Photo project title: ')).trim();
    } finally {
      prompt.close();
    }
  }
  if (!title) throw new Error('A project title is required.');

  const slug = slugify(title);
  if (!slug) throw new Error('The title must include a letter or number.');

  const filename = `${date.replaceAll('-', '')}-${slug}.md`;
  const destination = path.join(root, 'src/content/photography', filename);
  try {
    await writeFile(destination, photographyPost(title, date, photos), { flag: 'wx' });
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(
        `Post ${path.relative(root, destination)} already exists. Choose another title or rename the existing post.`,
      );
    }
    throw error;
  }

  console.log(`Created draft ${path.relative(root, destination)} with ${photos.length} photos.`);
  console.log('Add your introduction before publishing.');
  console.log(
    'Remove old photos from photo-inbox before a later upload if you want a fresh batch.',
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
