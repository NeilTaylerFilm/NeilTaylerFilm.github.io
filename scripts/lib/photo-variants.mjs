import sharp from 'sharp';
import { createHash } from 'node:crypto';
export async function photoVariants(bytes, origin) {
  const hash = createHash('sha256').update('r2-photo-v1').update(bytes).digest('hex').slice(0, 32);
  const meta = await sharp(bytes).metadata();
  if ((meta.pages || 1) > 1)
    throw new Error('Animated images are not supported. Export a still photograph.');
  const rotated = [5, 6, 7, 8].includes(meta.orientation);
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  if (!width || !height) throw new Error('Could not read photograph dimensions.');
  const maxWidth = Math.min(width, Math.round(width * Math.min(1, 2560 / Math.max(width, height))));
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
