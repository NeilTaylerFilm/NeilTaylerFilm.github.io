import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const contentRoot = path.join(root, 'src', 'content');
const templateRoot = path.join(root, 'obsidianTemplates');
const collections = ['blog', 'photography', 'post-production'];
const retiredFields = new Set([
  'type',
  'categories',
  'roles',
  'projectType',
  'format',
  'related',
  'relatedPosts',
  'featured',
]);

async function markdownFiles(directory, { optional = false } = {}) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return [];
    throw error;
  }
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return markdownFiles(fullPath);
      return entry.isFile() && /\.mdx?$/i.test(entry.name) ? [fullPath] : [];
    }),
  );
  return nested.flat();
}

function frontmatterKeys(source) {
  const match = source.match(/^---[ \t]*\r?\n([\s\S]*?)^---[ \t]*$/m);
  if (!match) return [];

  const frontmatter = match[1];
  const isJsonStyle = frontmatter.trimStart().startsWith('{');
  if (isJsonStyle) {
    try {
      const parsed = JSON.parse(frontmatter);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.keys(parsed);
      }
    } catch {
      // Astro's schema validation reports malformed frontmatter; keep the retired-key check useful too.
    }

    const fields = [...frontmatter.matchAll(/^([ \t]*)["']?([A-Za-z][\w-]*)["']?\s*:/gm)];
    if (!fields.length) return [];
    const rootIndent = Math.min(...fields.map((field) => field[1].length));
    return fields.filter((field) => field[1].length === rootIndent).map((field) => field[2]);
  }

  return [...frontmatter.matchAll(/^["']?([A-Za-z][\w-]*)["']?\s*:/gm)].map((field) => field[1]);
}

test('frontmatter field guard recognizes quoted YAML and indented JSON root keys', () => {
  const yaml = `---\n\"categories\":\n  - Photography\nimages:\n  - src: photo.jpg\n    alt: Portrait\n---`;
  const json = `---\n{\n    \"relatedPosts\": [],\n    \"images\": [{\n        \"type\": \"image\"\n    }]\n}\n---`;
  const nestedOnly = `---\nimages:\n  - src: photo.jpg\n    type: image\n---`;
  const commentOnly = `---\n# type: image\n---`;

  assert.deepEqual(frontmatterKeys(yaml), ['categories', 'images']);
  assert.deepEqual(frontmatterKeys(json), ['relatedPosts', 'images']);
  assert.deepEqual(frontmatterKeys(nestedOnly), ['images']);
  assert.deepEqual(frontmatterKeys(commentOnly), []);
});

test('optional authoring templates may be absent from a clean checkout', async () => {
  const missingTemplates = path.join(templateRoot, `.missing-${process.pid}`);
  assert.deepEqual(await markdownFiles(missingTemplates, { optional: true }), []);
});

test('content and Obsidian templates do not use retired metadata fields', async () => {
  const contentFiles = (
    await Promise.all(
      collections.map((collection) => markdownFiles(path.join(contentRoot, collection))),
    )
  ).flat();
  const files = [...contentFiles, ...(await markdownFiles(templateRoot, { optional: true }))];
  const findings = [];

  for (const file of files) {
    const keys = frontmatterKeys(await readFile(file, 'utf8'));
    for (const key of keys) {
      if (retiredFields.has(key)) findings.push(`${path.relative(root, file)}: ${key}`);
    }
  }

  assert.deepEqual(
    findings,
    [],
    'Migrate these authored fields to category/tags/role or remove them',
  );
});
