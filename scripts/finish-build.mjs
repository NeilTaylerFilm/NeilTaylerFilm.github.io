import { readFile, rm } from 'node:fs/promises';
// Camera originals under public/images are authoring inputs, never deployment assets.
const manifest = JSON.parse(await readFile('src/generated/images.json', 'utf8'));
for (const source of Object.keys(manifest)) {
  if (source.startsWith('/images/') && source !== '/images/social-card.png')
    await rm(`dist${source}`, { force: true });
}
// Keep cache files locally, but omit obsolete derivatives from the deployed artifact.
const used = new Set(
  Object.values(manifest).flatMap((info) =>
    [info.srcset, info.fallbackSrcset].flatMap((set) =>
      set.split(', ').map((item) => item.split(' ')[0].split('/').at(-1)),
    ),
  ),
);
const { readdir } = await import('node:fs/promises');
for (const file of await readdir('dist/_images')) {
  if (!used.has(file)) await rm(`dist/_images/${file}`, { recursive: true, force: true });
}
