import { getCollection } from 'astro:content';
import { categoryKey, projectTimestamp, postCategories } from './feed';
export { excerpt, isoDate, categoryKey, comparators, projectTimestamp } from './feed';
// Both listing and route generation use the same publication rule.
export async function posts() {
  return (await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id),
  );
}
export async function projects() {
  return (
    await getCollection('photography', ({ data }) => import.meta.env.DEV || !data.draft)
  ).sort((a, b) => projectTimestamp(b.data) - projectTimestamp(a.data) || a.id.localeCompare(b.id));
}
export async function postProjects() {
  return (
    await getCollection('postProduction', ({ data }) => import.meta.env.DEV || !data.draft)
  ).sort((a, b) => projectTimestamp(b.data) - projectTimestamp(a.data) || a.id.localeCompare(b.id));
}
export function categories(entries: { data: { category?: string; categories?: string[] } }[]) {
  return [
    ...new Map(
      entries.flatMap(({ data }) =>
        postCategories(data).map((category) => [categoryKey(category), category] as const),
      ),
    ).values(),
  ].sort();
}
