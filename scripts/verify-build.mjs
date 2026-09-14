import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('dist');
const origin = 'https://neiltaylerfilm.github.io';
const errors = [];
const htmlFiles = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (file.endsWith('.html')) htmlFiles.push(file);
  }
}
await walk(root);
function decode(value) {
  return value.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
}
async function resolveURL(raw, base) {
  const url = new URL(decode(raw), base);
  if (url.origin !== origin) return;
  let target = path.join(root, decodeURIComponent(url.pathname));
  if (!target.startsWith(root + path.sep) && target !== root) {
    errors.push(`Outside build: ${url}`);
    return;
  }
  if (url.pathname.endsWith('/')) target = path.join(target, 'index.html');
  else if (!path.extname(target)) target = path.join(target, 'index.html');
  if (!(await stat(target).catch(() => null))?.isFile())
    errors.push(`Broken internal URL: ${url} from ${base}`);
  else if (url.hash && target.endsWith('.html')) {
    const html = await readFile(target, 'utf8');
    if (!html.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`))
      errors.push(`Missing fragment: ${url}`);
  }
}
const titles = new Set();
for (const file of htmlFiles) {
  const relative = path.relative(root, file).split(path.sep).join('/');
  const base = new URL(relative.replace(/index\.html$/, ''), origin + '/');
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) await resolveURL(match[1], base);
  for (const match of html.matchAll(/\bsrcset="([^"]+)"/g))
    for (const src of match[1].split(',')) await resolveURL(src.trim().split(/\s+/)[0], base);
  for (const match of html.matchAll(/\bdata-slides="([^"]+)"/g)) {
    for (const slide of JSON.parse(decode(match[1]))) {
      await resolveURL(slide.src, base);
      if (slide.project) await resolveURL(`/photography/${slide.project}/`, base);
    }
  }
  if (relative === 'blog/index.html') continue; // Static redirect for the old blog URL.
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  if (new Set(ids).size !== ids.length) errors.push(`Duplicate IDs: ${relative}`);
  for (const img of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt(?:=|\s|>)/.test(img[0]) || !/\bwidth=/.test(img[0]) || !/\bheight=/.test(img[0]))
      errors.push(`Image missing alt/dimensions: ${relative}`);
  }
  for (const json of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  ))
    JSON.parse(json[1]);
  if (html.includes('application/rss+xml')) errors.push(`Unexpected RSS metadata: ${relative}`);
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  if (!title || titles.has(title)) errors.push(`Missing or duplicate title: ${relative}`);
  titles.add(title);
  if (!html.includes('name="description"')) errors.push(`Missing description: ${relative}`);
  if (!html.includes(`rel="canonical" href="${origin}`))
    errors.push(`Incorrect production canonical: ${relative}`);
  if ((html.match(/<h1(?:\s|>)/g) || []).length !== 1) errors.push(`Expected one h1: ${relative}`);
  const ogImage = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  if (ogImage) await resolveURL(ogImage, base);
  else errors.push(`Missing social image: ${relative}`);
}
assert.ok(!(await stat(path.join(root, 'rss.xml')).catch(() => null)), 'RSS must remain disabled');
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
for (const link of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) await resolveURL(link[1], origin);
assert.ok(!sitemap.includes('/404'));
for (const collection of ['blog', 'photography']) {
  for (const name of await readdir(`src/content/${collection}`)) {
    if (!name.endsWith('.md')) continue;
    const body = await readFile(`src/content/${collection}/${name}`, 'utf8');
    if (/^draft:\s*true\s*$/m.test(body.split('---')[1] || '')) {
      const url = `/${collection}/${name.replace(/\.md$/, '')}/`;
      if (sitemap.includes(url)) errors.push(`Draft leaked: ${url}`);
      if (await stat(path.join(root, url, 'index.html')).catch(() => null))
        errors.push(`Draft route generated: ${url}`);
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(
  `Verified ${htmlFiles.length} HTML pages: links, image variants, fragments, titles, production canonicals, sitemap and draft exclusion.`,
);
