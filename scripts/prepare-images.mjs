import { readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const publicRoot = path.resolve('public');
const manifest = {};
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(file);
      continue;
    }
    if (!/\.(jpe?g|png|webp|avif)$/i.test(file)) continue;
    const relative = path.relative(publicRoot, file).split(path.sep).join('/');
    const meta = await sharp(file).metadata();
    const rotated = [5, 6, 7, 8].includes(meta.orientation);
    const width = rotated ? meta.height : meta.width;
    const height = rotated ? meta.width : meta.height;
    const variants = [];
    for (const size of [480, 960, 1440].filter((size) => size < width)) {
      const target = `_images/${relative}.${size}.webp`;
      const output = path.join(publicRoot, target);
      const fresh = await stat(output)
        .then((s) => s.mtimeMs)
        .catch(() => 0);
      if (fresh < (await stat(file)).mtimeMs) {
        await mkdir(path.dirname(output), { recursive: true });
        // Auto-orient and convert to sRGB. Never crop or apply aesthetic filters.
        await sharp(file)
          .rotate()
          .resize({ width: size, withoutEnlargement: true })
          .toColourspace('srgb')
          .webp({ quality: 86 })
          .toFile(output);
      }
      variants.push(`/${target} ${size}w`);
    }
    variants.push(`/${relative} ${width}w`);
    manifest[`/${relative}`] = { width, height, srcset: variants.join(', ') };
  }
}
await mkdir('public/images', { recursive: true });
const socialSource = 'src/assets/social-card.svg';
const socialOutput = 'public/images/social-card.png';
if (
  (await stat(socialOutput)
    .then((s) => s.mtimeMs)
    .catch(() => 0)) < (await stat(socialSource)).mtimeMs
) {
  await sharp(socialSource).png().toFile(socialOutput);
}
await walk(path.join(publicRoot, 'images'));
await mkdir('src/generated', { recursive: true });
await writeFile('src/generated/images.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared responsive images for ${Object.keys(manifest).length} originals.`);
