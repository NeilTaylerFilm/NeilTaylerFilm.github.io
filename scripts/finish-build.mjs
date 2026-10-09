// ==========================================
// 🧹 THE POST-BUILD HOUSEKEEPER (scripts/finish-build.mjs)
// ==========================================
// When the Astro engine finishes building your website into the "dist/" folder,
// this script sweeps the floor before uploading to the live web:
// 1. It throws away huge raw camera originals from the dist folder (keeping only
//    the lightweight compressed versions).
// 2. It removes old or unused leftover images so your website stays feather-light!

// Remove camera originals from the build output after image processing is complete.
// --- BORROWED TOOLS (Imports) ---
// readFile, rm: Filesystem tools to read JSON manifests and remove unneeded build files.
import { readFile, rm } from 'node:fs/promises';

// 📖 Read our image registry
// Camera originals under public/images are authoring inputs, never deployment assets.
const manifest = JSON.parse(await readFile('src/generated/images.json', 'utf8'));

// 🗑️ STEP 1: Delete big camera original files from dist/images/
for (const source of Object.keys(manifest)) {
  if (
    source.startsWith('/images/') &&
    source !== '/images/social-card.png' &&
    !source.startsWith('/images/photography-thumbnails/')
  )
    await rm(`dist${source}`, { force: true });
}

// 🎯 STEP 2: Collect all image files that are actually being used by published pages
// Keep cache files locally, but omit obsolete derivatives from the deployed artifact.
const used = new Set(
  Object.values(manifest).flatMap((info) =>
    [info.srcset, info.fallbackSrcset].flatMap((set) =>
      set.split(', ').map((item) => item.split(' ')[0].split('/').at(-1)),
    ),
  ),
);

// 🗑️ STEP 3: Delete any leftover images in dist/_images/ that aren't in the used set
const { readdir } = await import('node:fs/promises');
for (const file of await readdir('dist/_images')) {
  if (!used.has(file)) await rm(`dist/_images/${file}`, { recursive: true, force: true });
}
