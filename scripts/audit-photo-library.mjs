// ==========================================
// 🕵️ THE PHOTO LIBRARY DETECTIVE (scripts/audit-photo-library.mjs)
// ==========================================
// This script acts like a detective with a magnifying glass!
// It double-checks every photo on your website:
// 1. Scans every blog post and photography project in your codebase.
// 2. Extracts every Cloudflare image web address you wrote.
// 3. Cross-references them with your database (src/data/r2-images.json).
// 4. Catches broken photo links or missing image sizes before your visitors see them!

// Scan source files for photo URLs and cross-reference them against the R2 registry.
// --- BORROWED TOOLS (Imports) ---
// readdir, readFile: Filesystem tools to scan project directories and inspect file text.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const registryPath = path.join(root, 'src/data/r2-images.json');

// 🔍 Patterns matching valid Cloudflare photo addresses (32-character hash + pixel width)
const photoUrlPattern = /https:\/\/[^/\s"'<>]+\/photos\/[a-f0-9]{32}-\d+\.(?:jpeg|webp)/gi;
const validPhotoUrl = /^https:\/\/[^/]+\/photos\/[a-f0-9]{32}-\d+\.(?:jpeg|webp)$/i;
const extensions = new Set(['.astro', '.js', '.json', '.md', '.mdx', '.ts']);

// 📂 Helper: Recursively finds all code and content files in a directory
async function sourceFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await sourceFiles(filename)));
    else if (extensions.has(path.extname(entry.name)) && filename !== registryPath)
      result.push(filename);
  }
  return result;
}

// 🔗 Helper: Extracts all photo URLs found inside a string of text
function urlsIn(value) {
  return [...value.matchAll(photoUrlPattern)].map(([url]) => url);
}

// 🆔 Helper: Extracts the unique 32-character photo fingerprint from a URL
function photoId(url) {
  return new URL(url).pathname.match(/\/photos\/([a-f0-9]{32})-/i)?.[1];
}

// 📖 Load the database of all registered Cloudflare photos
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const registeredUrls = new Set();
const errors = [];

for (const [key, info] of Object.entries(registry)) {
  if (!validPhotoUrl.test(key)) errors.push(`Invalid registry address: ${key}`);
  else registeredUrls.add(key);

  if (!info || !Number.isInteger(info.width) || info.width < 1) {
    errors.push(`Invalid width for ${key}`);
    continue;
  }
  if (!Number.isInteger(info.height) || info.height < 1) errors.push(`Invalid height for ${key}`);

  for (const field of ['src', 'full']) {
    if (typeof info[field] !== 'string' || !validPhotoUrl.test(info[field])) {
      errors.push(`Invalid ${field} address for ${key}`);
    } else {
      registeredUrls.add(info[field]);
    }
  }

  for (const field of ['srcset', 'fallbackSrcset']) {
    const candidates = typeof info[field] === 'string' ? urlsIn(info[field]) : [];
    if (!candidates.length || candidates.some((url) => !validPhotoUrl.test(url))) {
      errors.push(`Invalid ${field} for ${key}`);
    } else {
      for (const url of candidates) registeredUrls.add(url);
    }
  }
}

const references = new Map();
let scannedFiles = 0;
for (const folder of ['src/content', 'src/data']) {
  for (const filename of await sourceFiles(path.join(root, folder))) {
    scannedFiles += 1;
    const lines = (await readFile(filename, 'utf8')).split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      for (const url of urlsIn(lines[index])) {
        const locations = references.get(url) || [];
        locations.push(`${path.relative(root, filename)}:${index + 1}`);
        references.set(url, locations);
      }
    }
  }
}

const referencedIds = new Set();
for (const [url, locations] of references) {
  if (!validPhotoUrl.test(url)) {
    errors.push(`Invalid photo URL at ${locations[0]}: ${url}`);
    continue;
  }
  referencedIds.add(photoId(url));
  if (!registeredUrls.has(url)) errors.push(`Photo is missing from the registry at ${locations[0]}: ${url}`);
}

const unusedCount = Object.keys(registry).filter((url) => !referencedIds.has(photoId(url))).length;
console.log(`Scanned ${scannedFiles} content and data files; found ${references.size} distinct photo addresses.`);
console.log(`Checked ${Object.keys(registry).length} registry entries; ${referencedIds.size} photos are referenced.`);
console.log(`${unusedCount} registry entries are not referenced by current content. They were not changed.`);

if (errors.length) {
  console.error(`\nPhoto library audit found ${errors.length} problem(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Photo addresses and responsive variants are present in the committed registry.');
}
