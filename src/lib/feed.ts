export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
export const categoryKey = (category: string) => category.trim().toLocaleLowerCase('en');
// Add a comparator here when a real additional data source exists.
export const comparators = {
  newest: (a: { date: number; id: string }, b: { date: number; id: string }) =>
    b.date - a.date || a.id.localeCompare(b.id),
  oldest: (a: { date: number; id: string }, b: { date: number; id: string }) =>
    a.date - b.date || a.id.localeCompare(b.id),
};
export function excerpt(body = '', manual?: string) {
  if (manual?.trim()) return manual.trim();
  const plain = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s*|[-*+]\s+|\d+\.\s+)/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const preview = [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(plain)]
    .slice(0, 2)
    .map(({ segment }) => segment)
    .join('')
    .trim();
  return preview.length > 330 ? preview.slice(0, 327).replace(/\s+\S*$/, '') + '…' : preview;
}

export function projectTimestamp(data: { date?: Date; year?: string | number }) {
  return data.date?.getTime() ?? (data.year ? Date.parse(`${data.year}-01-01`) : 0);
}

export function postCategories(data: { categories?: string[]; category?: string }) {
  const values = data.categories ?? (data.category ? [data.category] : []);
  const unique = new Map<string, string>();
  for (const value of values) {
    const label = value.trim();
    if (label && !unique.has(categoryKey(label))) unique.set(categoryKey(label), label);
  }
  return [...unique.values()];
}
export function matchesCategory(categories: string[], selected: string) {
  return (
    !selected || categories.some((category) => categoryKey(category) === categoryKey(selected))
  );
}
