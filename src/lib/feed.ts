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
  return plain.length > 330 ? plain.slice(0, 327).replace(/\s+\S*$/, '') + '…' : plain;
}
