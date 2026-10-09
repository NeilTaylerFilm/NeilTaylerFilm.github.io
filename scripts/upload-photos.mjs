// ==========================================
// 🚀 THE CLOUDFLARE PHOTO UPLOADER (scripts/upload-photos.mjs)
// ==========================================
// Think of this script as your automated photo delivery truck!
// How it works:
// 1. You drop raw camera photos into the "photo-inbox/" folder on your Mac.
// 2. You run "npm run photos:upload" in your terminal.
// 3. This truck creates responsive sizes (phones, tablets, computers) for each photo.
// 4. It uploads them securely to your Cloudflare R2 storage vault.
// 5. It creates a cheatsheet file ("photo-inbox/UPLOAD-RESULTS.md") with ready-to-copy
//    Markdown and image links so you can paste them directly into your blog posts!

// Upload photos from photo-inbox to R2, create responsive derivatives, and update the image registry.
// --- BORROWED TOOLS (Imports) ---
// readdir, readFile, writeFile, mkdir, rename, open, unlink: Node.js filesystem tools.
import { readdir, readFile, writeFile, mkdir, rename, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// PutObjectCommand: S3 upload instruction that pushes bytes to the Cloudflare R2 bucket.
import { PutObjectCommand } from '@aws-sdk/client-s3';
// connection, inventory, uploadBudget: Our R2 vault keys and safety checks.
import { connection, inventory, uploadBudget } from './lib/r2.mjs';
// photoVariants: The darkroom resizing engine generating WebP/JPEG sizes.
import { photoVariants } from './lib/photo-variants.mjs';

// 📂 Set current directory to the project root folder
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

// 🎛️ Terminal flags: --check (test connection), --dry-run (preview without uploading)
const args = process.argv.slice(2);
const check = args.includes('--check');
const dry = args.includes('--dry-run');
const positional = args.filter((a) => !a.startsWith('--'));

// 🛑 Validate command line options
if (
  args.some((a) => a.startsWith('--') && !['--check', '--dry-run'].includes(a)) ||
  positional.length > 1
) {
  console.error('Use npm run photos:upload -- [folder] [--dry-run], or npm run photos:check');
  process.exit(1);
}

// 🔒 THE TRAFFIC CONE (Lock file): Prevents two uploads from crashing into each other
const lockPath = '.photo-upload.lock';
let locked = false;
try {
  // Try to create the lock file. Fails if another upload is already running!
  const lock = await open(lockPath, 'wx', 0o600);
  await lock.close();
  locked = true;

  // 🔑 Connect to Cloudflare R2 vault and list existing photos
  const { client, bucket, origin } = await connection();
  const objects = await inventory(client, bucket);

  // 🔍 If visitor ran "npm run photos:check", just print bucket health and exit!
  if (check) {
    console.log(
      `Connected to the photo bucket. ${objects.size} objects; ${([...objects.values()].reduce((a, b) => a + b, 0) / 1e6).toFixed(2)} MB stored.`,
    );
  } else {
    // 📁 Look inside the "photo-inbox/" folder
    const folder = path.resolve(positional[0] || 'photo-inbox');
    if (!folder.startsWith(root)) {
      console.error('Folder must be within the project root.');
      process.exit(1);
    }

    // 🔎 Find all image files (.jpg, .png, .heic, .webp, .avif)
    const entries = (await readdir(folder, { withFileTypes: true }))
      .filter((e) => e.isFile() && /\.(jpe?g|webp|png|avif|heic|heif)$/i.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!entries.length)
      throw new Error(
        'No supported photos found. Put JPEG, WebP, PNG, AVIF or HEIC/HEIF files in photo-inbox first (HEIC/HEIF requires macOS).',
      );

    // 📖 Load existing image database (src/data/r2-images.json)
    const manifestPath = 'src/data/r2-images.json';
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const report = [
      '# Uploaded photos',
      '',
      'Copy an image address below into your post, slideshow or project. Replace the suggested description with your own.',
      '',
    ];

    // 🔄 PROCESS EACH PHOTO IN THE INBOX ONE BY ONE
    for (const entry of entries) {
      // 1. Generate phone/tablet/desktop sizes
      const result = await photoVariants(await readFile(path.join(folder, entry.name)), origin);
      // 2. Make sure total storage stays under 8 GB
      const plan = uploadBudget(objects, result.files);
      console.log(
        `${entry.name}: ${plan.pending.length} new sizes, ${(plan.added / 1e6).toFixed(2)} MB${dry ? ' (preview only)' : ''}`,
      );
      // If --dry-run was passed, just pretend and skip the real upload
      if (dry) {
        for (const file of plan.pending) objects.set(file.key, file.bytes.length);
        continue;
      }

      // ☁️ UPLOAD: Send each generated size file directly to Cloudflare R2
      for (const file of plan.pending) {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: file.key,
            Body: file.bytes,
            ContentType: file.type,
            CacheControl: 'public, max-age=31536000, immutable', // Tell browsers to cache for 1 year
            IfNoneMatch: '*', // Don't overwrite if it already exists
          }),
        );
        objects.set(file.key, file.bytes.length);
      }

      // 🔍 VERIFICATION PING: Make a quick test request to ensure Cloudflare Worker can serve it!
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

      // 📝 RECORD IN DATABASE: Save width, height, and responsive srcset into src/data/r2-images.json
      manifest[result.reference] = result.info;
      await writeFile(manifestPath + '.tmp', JSON.stringify(manifest, null, 2) + '\n');
      await rename(manifestPath + '.tmp', manifestPath);

      // 📋 WRITE CHEATSHEET SNIPPET: Create ready-to-copy code blocks for Markdown and TypeScript
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
  // 🛡️ Safety: Never print secret passwords or token headers if an error occurs!
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
  // 🧹 CLEANUP: Always remove lock file when finished so future uploads can run!
  if (locked) await unlink(lockPath);
}
