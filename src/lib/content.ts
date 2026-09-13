import { getCollection } from 'astro:content';
export { excerpt, isoDate, categoryKey, comparators } from './feed';
export async function posts() {
  return (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id),
  );
}
export async function projects() {
  return (await getCollection('photography', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id),
  );
}
