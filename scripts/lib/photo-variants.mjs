import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const run = promisify(execFile);

// macOS supplies the HEVC decoder missing from the bundled Sharp build.
async function decodeHeic(bytes) {
  if (process.platform !== 'darwin') {
    throw new Error('HEIC uploads currently require macOS. Export as JPEG on other computers.');
  }
  const directory = await mkdtemp(path.join(tmpdir(), 'photo-heic-'));
  try {
    const source = path.join(directory, 'source.heic');
    const decoded = path.join(directory, 'decoded.png');
    await writeFile(source, bytes);
    await run('/usr/bin/sips', ['-s', 'format', 'png', source, '--out', decoded]);
    return await readFile(decoded);
  } catch {
    throw new Error(
      'macOS could not decode this HEIC photograph. Try exporting it as JPEG in Preview.',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
export async function photoVariants(bytes, origin) {
  let meta = await sharp(bytes).metadata();
  const heic = meta.format === 'heif' && meta.compression === 'hevc';
  const hash = createHash('sha256')
    .update(heic ? 'r2-heic-v1' : 'r2-photo-v1')
    .update(bytes)
    .digest('hex')
    .slice(0, 32);
  if ((meta.pages || 1) > 1)
    throw new Error('Animated images are not supported. Export a still photograph.');
  if (heic) {
    bytes = await decodeHeic(bytes);
    meta = await sharp(bytes).metadata();
  }
  const rotated = [5, 6, 7, 8].includes(meta.orientation);
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  if (!width || !height) throw new Error('Could not read photograph dimensions.');
  const roundWidth = heic ? Math.floor : Math.round;
  const maxWidth = Math.min(
    width,
    Math.max(1, roundWidth(width * Math.min(1, 2560 / Math.max(width, height)))),
  );
  const sizes = [...new Set([480, 960, 1440, 1920].filter((s) => s < maxWidth).concat(maxWidth))];
  const files = [];
  for (const size of sizes) {
    for (const format of ['webp', 'jpeg']) {
      const result = await sharp(bytes)
        .rotate()
        .resize({ width: size, withoutEnlargement: true })
        .toColourspace('srgb')
        .toFormat(format, { quality: format === 'webp' ? 88 : 90 })
        .toBuffer({ resolveWithObject: true });
      files.push({
        key: `photos/${hash}-${size}.${format}`,
        bytes: result.data,
        width: result.info.width,
        height: result.info.height,
        type: `image/${format}`,
      });
    }
  }
  const jpeg = files.filter((f) => f.type === 'image/jpeg');
  const webp = files.filter((f) => f.type === 'image/webp');
  const url = (f) => `${origin}/${f.key}`;
  const largest = jpeg.at(-1);
  return {
    files,
    reference: url(largest),
    info: {
      width: largest.width,
      height: largest.height,
      src: url(jpeg[Math.min(1, jpeg.length - 1)]),
      full: url(largest),
      srcset: webp.map((f) => `${url(f)} ${f.width}w`).join(', '),
      fallbackSrcset: jpeg.map((f) => `${url(f)} ${f.width}w`).join(', '),
    },
  };
}
