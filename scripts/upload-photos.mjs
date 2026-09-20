import { readdir, readFile, writeFile, mkdir, rename, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { connection, inventory, uploadBudget } from './lib/r2.mjs';
import { photoVariants } from './lib/photo-variants.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const args = process.argv.slice(2);
const check = args.includes('--check');
const dry = args.includes('--dry-run');
const positional = args.filter((a) => !a.startsWith('--'));
if (
  args.some((a) => a.startsWith('--') && !['--check', '--dry-run'].includes(a)) ||
  positional.length > 1
) {
  console.error('Use npm run photos:upload -- [folder] [--dry-run], or npm run photos:check');
  process.exit(1);
}
const lockPath = '.photo-upload.lock';
let locked = false;
try {
  const lock = await open(lockPath, 'wx', 0o600);
  await lock.close();
  locked = true;
  const { client, bucket, origin } = await connection();
  const objects = await inventory(client, bucket);
  if (check) {
    console.log(
      `Connected to the photo bucket. ${objects.size} objects; ${([...objects.values()].reduce((a, b) => a + b, 0) / 1e6).toFixed(2)} MB stored.`,
    );
  } else {
    const folder = path.resolve(positional[0] || 'photo-inbox');
    if (!folder.startsWith(root)) {
      console.error('Folder must be within the project root.');
      process.exit(1);
    }
    const entries = (await readdir(folder, { withFileTypes: true }))
      .filter((e) => e.isFile() && /\.(jpe?g|webp|png|avif|heic|heif)$/i.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!entries.length)
      throw new Error(
        'No supported photos found. Put JPEG, WebP, PNG, AVIF or HEIC/HEIF files in photo-inbox first (HEIC/HEIF requires macOS).',
      );
    const manifestPath = 'src/data/r2-images.json';
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const report = [
      '# Uploaded photos',
      '',
      'Copy an image address below into your post, slideshow or project. Replace the suggested description with your own.',
      '',
    ];
    for (const entry of entries) {
      const result = await photoVariants(await readFile(path.join(folder, entry.name)), origin);
      const plan = uploadBudget(objects, result.files);
      console.log(
        `${entry.name}: ${plan.pending.length} new sizes, ${(plan.added / 1e6).toFixed(2)} MB${dry ? ' (preview only)' : ''}`,
      );
      if (dry) {
        for (const file of plan.pending) objects.set(file.key, file.bytes.length);
        continue;
      }
      for (const file of plan.pending) {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: file.key,
            Body: file.bytes,
            ContentType: file.type,
            CacheControl: 'public, max-age=31536000, immutable',
            IfNoneMatch: '*',
          }),
        );
        objects.set(file.key, file.bytes.length);
      }
      // Register only after every size exists and the public gateway can deliver it.
      const response = await fetch(result.reference, {
        method: 'HEAD',
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok || response.headers.get('content-type') !== 'image/jpeg') {
        throw new Error(
          'Upload completed but public image verification failed. Check the Worker binding, then rerun.',
        );
      }
      manifest[result.reference] = result.info;
      await writeFile(manifestPath + '.tmp', JSON.stringify(manifest, null, 2) + '\n');
      await rename(manifestPath + '.tmp', manifestPath);
      report.push(
        `## ${entry.name}`,
        '',
        `Image address: ${result.reference}`,
        '',
        `Dimensions: ${result.info.width} × ${result.info.height}`,
        '',
        'Blog body:',
        '',
        '~~~markdown',
        `![Describe your photograph](${result.reference})`,
        '~~~',
        '',
        'Blog cover:',
        '',
        '~~~yaml',
        `image: "${result.reference}"`,
        'imageAlt: "Describe your photograph"',
        '~~~',
        '',
        'Project image:',
        '',
        '~~~yaml',
        `  - src: "${result.reference}"`,
        '    alt: "Describe your photograph"',
        '~~~',
        '',
        'Slideshow item (inside the featured list):',
        '',
        '~~~ts',
        '{',
        `  src: "${result.reference}",`,
        '  alt: "Describe your photograph",',
        `  width: ${result.info.width},`,
        `  height: ${result.info.height},`,
        '},',
        '~~~',
        '',
      );
      await mkdir('photo-inbox', { recursive: true });
      await writeFile('photo-inbox/UPLOAD-RESULTS.md', report.join('\n'));
    }
    console.log(
      dry
        ? 'Preview complete. Nothing uploaded or registered.'
        : 'Done. Open photo-inbox/UPLOAD-RESULTS.md for the image addresses. Publish your content and src/data/r2-images.json together.',
    );
  }
} catch (error) {
  // Never print SDK request objects, headers, credentials, or raw remote responses.
  const safe = ['AccessDenied', 'InvalidAccessKeyId', 'SignatureDoesNotMatch'].includes(error.name);
  console.error(
    safe
      ? 'R2 rejected the credentials. Check bucket permissions and saved keys.'
      : error.$metadata
        ? `R2 request failed (HTTP ${error.$metadata.httpStatusCode || 'unknown'}). No credentials were printed. You can rerun safely.`
        : error.code === 'EEXIST'
          ? 'Another upload is running, or a previous upload was interrupted. Ask Codex before removing .photo-upload.lock.'
          : error.message,
  );
  process.exitCode = 1;
} finally {
  if (locked) await unlink(lockPath);
}
