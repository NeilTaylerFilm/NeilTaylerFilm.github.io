// ==========================================
// 📰 THE CONTENT KITCHEN (Dates, Tags, Previews & Sorters)
// ==========================================
// This file is like a prep station in a kitchen:
// - It slices blog posts into bite-sized preview teasers.
// - It puts items in order (newest first or oldest first).
// - It cleans up tags and categories so they match easily.

// Helpers for dates, categories, excerpts and sorting

// 📅 HELPER 1: Date Stamper
// Converts any complex date into a simple "YYYY-MM-DD" text string.
// A full computer timestamp includes hours, seconds, and timezones (e.g. 2024-06-15T12:00:00Z).
// Slicing the first 10 letters leaves just the clean calendar day.
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

// 🏷️ HELPER 2: Tag Tidier
// Removes accidental extra spaces and makes words lowercase so "Film" and "film " match!
// Using the English locale ensures letters like 'I' lowercase consistently across all computers.
export const categoryKey = (category: string) => category.trim().toLocaleLowerCase('en');

// 🗂️ HELPER 3: The Sorting Racks
// Tells the computer how to arrange articles:
// - 'newest': puts newest dates at the top
// - 'oldest': puts oldest dates at the top
// (If two dates are identical, it sorts alphabetically by ID so they don't jump around).
// Subtracting dates puts larger (newer) timestamps first; the || operator applies the tiebreaker.
// Add a comparator here when a real additional data source exists.
export const comparators = {
  newest: (a: { date: number; id: string }, b: { date: number; id: string }) =>
    b.date - a.date || a.id.localeCompare(b.id),
  oldest: (a: { date: number; id: string }, b: { date: number; id: string }) =>
    a.date - b.date || a.id.localeCompare(b.id),
};

// ✂️ HELPER 4: Teaser Snippet Cutter
// Takes a whole article and creates a lovely 1-2 sentence preview for your cards.
export function excerpt(body = '', manual?: string) {
  // If you wrote your own custom summary, use that immediately!
  if (manual?.trim()) return manual.trim();

  // Otherwise, clean up the text: strip out code blocks, pictures, links, hashtags, and stars
  const plain = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s*|[-*+]\s+|\d+\.\s+)/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Grab just the first two full sentences of the article
  const preview = [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(plain)]
    .slice(0, 2)
    .map(({ segment }) => segment)
    .join('')
    .trim();

  // If the preview is too long (over 330 letters), trim it cleanly and add a "…"
  return preview.length > 330 ? preview.slice(0, 327).replace(/\s+\S*$/, '') + '…' : preview;
}

// ⏱️ HELPER 5: Timeline Number Maker
// Turns a date (or year) into a single number of milliseconds so the computer can sort them easily.
export function projectTimestamp(data: { date?: Date; year?: string | number }) {
  return data.date?.getTime() ?? (data.year ? Date.parse(`${data.year}-01-01`) : 0);
}

// 🏷️ HELPER 6: Unique Category Finder
// Collects all category tags on an article and removes accidental duplicates.
export function postCategories(data: { categories?: string[]; category?: string }) {
  const values = data.categories ?? (data.category ? [data.category] : []);
  const unique = new Map<string, string>();
  for (const value of values) {
    const label = value.trim();
    if (label && !unique.has(categoryKey(label))) unique.set(categoryKey(label), label);
  }
  return [...unique.values()];
}

// 🎯 HELPER 7: Category Matcher
// Checks: "Does this article belong to the category button the visitor just clicked?"
export function matchesCategory(categories: string[], selected: string) {
  return (
    !selected || categories.some((category) => categoryKey(category) === categoryKey(selected))
  );
}

