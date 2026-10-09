// ==========================================
// 🎞️ THE PHOTO RESIZING DARKROOM (scripts/lib/photo-variants.mjs)
// ==========================================
// When you shoot photos on a high-end camera, the raw files are gigantic (40+ Megabytes!).
// Sending a massive file to a phone on a cellular connection makes the site crawl.
// This file acts like a smart automated darkroom:
// 1. It creates multiple lightweight sizes (small for phones, medium for laptops, big for 4K screens).
// 2. It converts them into modern, fast-loading WebP files (and trusty JPEGs for older browsers).
// 3. It gives every photo a unique fingerprint hash so the website never mixes them up.

// Generate responsive image variants using sharp.
// --- BORROWED TOOLS (Imports) ---
// sharp: High-performance image processing engine for resizing, converting, and rotating.
import sharp from 'sharp';
// createHash: Generates cryptographic SHA-256 fingerprints to identify photos uniquely.
import { createHash } from 'node:crypto';
// execFile & promisify: Runs system terminal programs (like Apple's 'sips') cleanly from async code.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
// mkdtemp, readFile, writeFile, rm: File management helpers to create and clean up temporary workspaces.
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const run = promisify(execFile);

// 🍏 IPHONE PHOTO TRANSLATOR (HEIC decoder)
// iPhones save pictures in Apple's special HEIC format.
// This helper asks macOS to translate it into standard PNG before we resize it!
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
    // Ask Apple's built-in 'sips' image engine to decode the HEIC file
    await run('/usr/bin/sips', ['-s', 'format', 'png', source, '--out', decoded]);
    return await readFile(decoded);
  } catch {
    throw new Error(
      'macOS could not decode this HEIC photograph. Try exporting it as JPEG in Preview.',
    );
  } finally {
    // Clean up temporary workspace folder
    await rm(directory, { recursive: true, force: true });
  }
}

// 🪄 THE VARIANT MAKER: Turns one original image into multiple responsive versions
export async function photoVariants(bytes, origin) {
  let meta = await sharp(bytes).metadata();
  const heic = meta.format === 'heif' && meta.compression === 'hevc';

  // 🏷️ Create a unique 32-character digital fingerprint of this photo
  const hash = createHash('sha256')
    .update(heic ? 'r2-heic-v1' : 'r2-photo-v1')
    .update(bytes)
    .digest('hex')
    .slice(0, 32);
  // 🛑 Stop GIFs and moving videos: only still photos allowed!
  if ((meta.pages || 1) > 1)
    throw new Error('Animated images are not supported. Export a still photograph.');
  if (heic) {
    bytes = await decodeHeic(bytes);
    meta = await sharp(bytes).metadata();
  }

  // 🔄 Check if camera was held vertically or sideways (EXIF orientation tag)
  const rotated = [5, 6, 7, 8].includes(meta.orientation);
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  if (!width || !height) throw new Error('Could not read photograph dimensions.');

  // 📏 Don't blow up tiny photos, and cap largest edge at 2560px for sanity
  const roundWidth = heic ? Math.floor : Math.round;
  const maxWidth = Math.min(
    width,
    Math.max(1, roundWidth(width * Math.min(1, 2560 / Math.max(width, height)))),
  );

  // 📱 Generate sizes: 480px (phone), 960px (tablet), 1440px (laptop), 1920px (desktop), plus max size
  const sizes = [...new Set([480, 960, 1440, 1920].filter((s) => s < maxWidth).concat(maxWidth))];
  const files = [];

  // 🏭 THE FACTORY LOOP: Create both WebP and JPEG copies at each size
  for (const size of sizes) {
    for (const format of ['webp', 'jpeg']) {
      const result = await sharp(bytes)
        // Auto-rotate according to camera EXIF tag
        .rotate()
        // Shrink cleanly, never stretch
        .resize({ width: size, withoutEnlargement: true })
        // Use standard sRGB web colors
        .toColourspace('srgb')
        // High visual quality with small filesize
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

  // 📦 BUNDLE EVERYTHING UP:
  // Build the responsive 'srcset' strings that tell web browsers which image to pick!
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
