import { readdir, mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

const manifest = JSON.parse(await readFile('src/data/r2-images.json', 'utf8'));
const processed = new Map();
async function walk(dir, prefix) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    const url = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      await walk(file, url);
      continue;
    }
    if (!/\.(jpe?g|png|webp|avif)$/i.test(file)) continue;
    const bytes = await readFile(file);
    // Include the recipe version so changed quality/colour settings invalidate old derivatives.
    const key = createHash('sha256').update('web-v2').update(bytes).digest('hex').slice(0, 20);
    if (processed.has(key)) {
      manifest[url] = processed.get(key);
      continue;
    }
    const meta = await sharp(bytes).metadata();
    const rotated = [5, 6, 7, 8].includes(meta.orientation);
    const width = rotated ? meta.height : meta.width;
    const height = rotated ? meta.width : meta.height;
    const sizes = [
      ...new Set(
        [480, 960, 1440, 1920, 2560].filter((s) => s < width).concat(Math.min(width, 2560)),
      ),
    ];
    const variants = { webp: [], jpeg: [] };
    for (const size of sizes) {
      for (const format of ['webp', 'jpeg']) {
        const target = `/\_images/${key}-${size}.${format}`;
        const output = `public${target}`;
        if (!(await stat(output).catch(() => null))) {
          // Sharp converts tagged input to standard sRGB and strips EXIF (including GPS).
          // Sources are never overwritten. No cropping, filters or sharpening.
          await sharp(bytes)
            .rotate()
            .resize({ width: size, withoutEnlargement: true })
            .toColourspace('srgb')
            .toFormat(format, { quality: format === 'webp' ? 88 : 90 })
            .toFile(output);
        }
        variants[format].push(`${target} ${size}w`);
      }
    }
    const info = {
      width,
      height,
      src: variants.jpeg[Math.min(1, sizes.length - 1)].split(' ')[0],
      full: variants.jpeg.at(-1).split(' ')[0],
      srcset: variants.webp.join(', '),
      fallbackSrcset: variants.jpeg.join(', '),
    };
    manifest[url] = info;
    processed.set(key, info);
  }
}
await mkdir('public/_images', { recursive: true });
await mkdir('public/images', { recursive: true });
await sharp('src/assets/social-card.svg').png().toFile('public/images/social-card.png');
await sharp('public/favicon.svg').resize(180, 180).png().toFile('public/apple-touch-icon.png');
const icon = await sharp('public/favicon.svg').resize(32, 32).png().toBuffer();
const iconHeader = Buffer.alloc(22);
iconHeader.writeUInt16LE(1, 2);
iconHeader.writeUInt16LE(1, 4);
iconHeader[6] = 32;
iconHeader[7] = 32;
iconHeader.writeUInt16LE(1, 10);
iconHeader.writeUInt16LE(32, 12);
iconHeader.writeUInt32LE(icon.length, 14);
iconHeader.writeUInt32LE(22, 18);
await writeFile('public/favicon.ico', Buffer.concat([iconHeader, icon]));

await walk('src/assets', '/assets');
await walk('public/images', '/images');
await mkdir('src/generated', { recursive: true });
await writeFile('src/generated/images.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `Prepared ${processed.size} unique images (${Object.keys(manifest).length} source paths).`,
);
