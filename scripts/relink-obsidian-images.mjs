#!/usr/bin/env node
// Update local photo-inbox image links in draft posts with their R2 URLs.
'use strict';

/**
 * ==============================================================================
 * Relink Obsidian Images Script
 * ==============================================================================
 * 
 * WHAT THIS SCRIPT DOES:
 * When you write blog posts in Obsidian, you might insert images that are saved
 * locally on your computer inside the "photo-inbox/" folder.
 * 
 * Once you run the upload command (`npm run photos:upload`), those images are
 * uploaded to the cloud (Cloudflare R2), giving each image a permanent web address.
 * 
 * This script scans your draft blog posts and automatically replaces the local
 * "photo-inbox/..." image links with the new public web addresses from Cloudflare R2.
 * 
 * SAFETY RULES:
 * 1. Only draft posts (`draft: true` in the header) are touched. Published posts are ignored.
 * 2. You can test it safely first by adding `--dry-run` to the command.
 *    In dry-run mode, it reports what it would change without modifying any files.
 * ==============================================================================
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ------------------------------------------------------------------------------
// File and Folder Paths
// ------------------------------------------------------------------------------

// Finds the root directory of this project (one level above this "scripts" folder)
const root = fileURLToPath(new URL('../', import.meta.url));

// Folder where your blog posts are stored
const blogDir = path.join(root, 'src/content/blog');

// File containing the list of uploaded images
const manifestPath = path.join(root, 'src/data/r2-images.json');

// File created by the photo uploader listing each file and its new web address
const reportPath = path.join(root, 'photo-inbox/UPLOAD-RESULTS.md');

// Check if the user ran the script with the `--dry-run` flag in the terminal
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

/**
 * Helper function: Checks if a file or folder exists on your disk.
 * Returns true if the file exists, false if it is missing.
 *
 * @param {string} p - The file path to check
 * @returns {Promise<boolean>}
 */
async function fileExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Main function: Carries out the relinking process step by step.
 */
async function main() {
  // ----------------------------------------------------------------------------
  // Step 1: Make sure the upload record exists before doing anything
  // ----------------------------------------------------------------------------
  if (!(await fileExists(manifestPath))) {
    console.error('Missing src/data/r2-images.json. Run upload-photos first.');
    process.exit(1);
  }

  // A lookup dictionary (Map) where:
  // Key = Original file name (e.g. "sunset.jpg")
  // Value = Public web address on Cloudflare R2 (e.g. "https://r2.../sunset.webp")
  const nameToR2 = new Map();

  // ----------------------------------------------------------------------------
  // Step 2: Read the upload report to match original file names with their web links
  // ----------------------------------------------------------------------------
  if (await fileExists(reportPath)) {
    const report = await readFile(reportPath, 'utf8');
    const lines = report.split('\n');
    let currentFile = null;

    // Scan the report line by line to pull out file names and their addresses
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Lines starting with '## ' tell us the file name (e.g., '## my-photo.jpg')
      if (line.startsWith('## ')) {
        currentFile = line.slice(3).trim();
      }
      // Lines starting with 'Image address:' contain the new cloud link for that file
      else if (line.startsWith('Image address:') && currentFile !== null) {
        const url = line.replace('Image address:', '').trim();
        nameToR2.set(currentFile, url);
        currentFile = null; // Reset for the next photo in the report
      }
    }
  } else {
    console.warn('No photo-inbox/UPLOAD-RESULTS.md found. Mapping by filename will be unavailable.');
  }

  // If we could not find any mapped images, there is nothing to relink
  if (!nameToR2.size) {
    console.error('No image mappings found in UPLOAD-RESULTS.md. Upload photos first with npm run photos:upload.');
    process.exit(1);
  }

  // ----------------------------------------------------------------------------
  // Step 3: Find all markdown blog post files in src/content/blog/
  // ----------------------------------------------------------------------------
  const entries = await readdir(blogDir, { withFileTypes: true });
  const markdownFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.md'));

  let totalReplacements = 0;
  const skipped = [];

  // ----------------------------------------------------------------------------
  // Step 4: Process each blog post file
  // ----------------------------------------------------------------------------
  for (const entry of markdownFiles) {
    const filePath = path.join(blogDir, entry.name);
    const originalContent = await readFile(filePath, 'utf8');

    // SAFETY CHECK: Only edit posts marked as drafts (`draft: true` in the front matter).
    // This ensures published articles are never changed unexpectedly.
    // Only the front matter block (between the first two `---` lines) is checked.
    const frontMatter = originalContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const isDraft = !!frontMatter && /^draft:\s*true\s*$/m.test(frontMatter[1]);
    if (!isDraft) {
      skipped.push(entry.name);
      continue;
    }

    let newContent = originalContent;

    // Looks up the R2 URL for a link target such as "name.png", "./photo-inbox/name.png"
    // or "photo-inbox/my%20pic.png". Matches by file name only, because Obsidian
    // writes the bare file name by default. Returns null for non-images and unknown files.
    const IMAGE_EXT = /\.(jpe?g|png|webp|avif|heic|heif)$/i;
    const lookup = (target) => {
      let clean = target.trim().replace(/^<|>$/g, '');
      try {
        clean = decodeURIComponent(clean);
      } catch {
        // Malformed % escape: use the text as written.
      }
      const filename = path.basename(clean);
      if (!IMAGE_EXT.test(filename)) return null;
      const url = nameToR2.get(filename);
      // If the photo was not found in the upload report, keep it unchanged and print a warning
      if (!url) console.warn(`[${entry.name}] Unknown image: ${filename}`);
      return url ?? null;
    };

    // --------------------------------------------------------------------------
    // Step 5: Replace Standard Markdown Image Links
    // Examples: ![alt](photo-inbox/sample.jpg), ![alt](./photo-inbox/sample.jpg),
    // ![alt](../photo-inbox/sample.jpg), ![alt](sample.jpg), ![alt](<my pic (1).jpg>)
    // Links that start with http(s): or data: are left alone.
    // --------------------------------------------------------------------------
    newContent = newContent.replace(
      /!\[([^\]]*)\]\((?!https?:|data:)(<[^>]+>|[^)]+)\)/g,
      (match, alt, target) => {
        const url = lookup(target);
        if (!url) return match;
        totalReplacements++;
        return `![${alt}](${url})`;
      },
    );

    // --------------------------------------------------------------------------
    // Step 6: Replace Obsidian Wikilink Style Image Links
    // Examples:
    // ![[Pasted image 2026.png]]  (Obsidian's default: bare file name)
    // ![[photo-inbox/sample.jpg]]
    // ![[sample.jpg|alt text]]
    // ![[sample.jpg|300]]         (a number is a display width, not alt text)
    // --------------------------------------------------------------------------
    newContent = newContent.replace(
      /!\[\[([^|\]]+)(?:\|([^\]]*))?\]\]/g,
      (match, target, extra = '') => {
        const url = lookup(target);
        if (!url) return match;
        totalReplacements++;
        // Converts the Obsidian wikilink into standard Markdown: ![alt text](cloud-url)
        const alt = /^\d+(x\d+)?$/.test(extra.trim()) ? '' : extra;
        return `![${alt}](${url})`;
      },
    );

    // --------------------------------------------------------------------------
    // Step 7: Save file if any image links were updated
    // --------------------------------------------------------------------------
    if (newContent !== originalContent) {
      if (dryRun) {
        console.log(`[dry-run] Would update ${entry.name}`);
      } else {
        await writeFile(filePath, newContent);
        console.log(`Updated ${entry.name}`);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // Step 8: Print summary of results
  // ----------------------------------------------------------------------------
  console.log(`Done. ${totalReplacements} replacement(s). ${skipped.length} non-draft file(s) skipped.`);
  if (dryRun) {
    console.log('Use without --dry-run to apply changes.');
  }
}

// Run the script and catch any unexpected fatal errors
main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
