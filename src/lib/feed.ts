// ==========================================
// 📰 THE CONTENT KITCHEN (Dates, Tags, Previews & Sorters)
// ==========================================
// This file is like a prep station in a kitchen:
// - It slices blog posts into bite-sized preview teasers.
// - It puts items in order (newest first or oldest first).
// - It normalizes primary categories and secondary tags for consistent filtering.

// Helpers for dates, classifications, excerpts and sorting

// 📅 HELPER 1: Date Stamper
// Converts any complex date into a simple "YYYY-MM-DD" text string.
// A full computer timestamp includes hours, seconds, and timezones (e.g. 2024-06-15T12:00:00Z).
// Slicing the first 10 letters leaves just the clean calendar day.
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

// 🏷️ HELPER 2: Classification Key
// Removes accidental extra spaces and makes labels lowercase so "Film" and "film " match!
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

function stripMdxComponents(body: string) {
  let result = '';
  for (let index = 0; index < body.length;) {
    const nameStart = body[index] === '<' ? index + (body[index + 1] === '/' ? 2 : 1) : -1;
    if (nameStart >= 0 && /[A-Z]/.test(body[nameStart] || '')) {
      let quote = '';
      let braces = 0;
      let end = nameStart;
      for (; end < body.length; end++) {
        const character = body[end];
        if (quote) {
          if (character === '\\') end++;
          else if (character === quote) quote = '';
        } else if (character === '"' || character === "'") quote = character;
        else if (character === '{') braces++;
        else if (character === '}' && braces) braces--;
        else if (character === '>' && braces === 0) break;
      }
      result += ' ';
      index = end < body.length ? end + 1 : body.length;
    } else {
      result += body[index++];
    }
  }
  return result;
}

// ✂️ HELPER 4: Teaser Snippet Cutter
// Takes a whole article and creates a lovely 1-2 sentence preview for your cards.
export function excerpt(body = '', manual?: string) {
  // If you wrote your own custom summary, use that immediately!
  if (manual?.trim()) return manual.trim();

  // Otherwise, clean up the text: strip out code blocks, pictures, links, hashtags, and stars
  const plain = stripMdxComponents(
    body
      .replace(
        /^\s*import\b(?:[ \t]*(['"])[^'"\r\n]+\1|[\s\S]*?\bfrom[ \t]+(['"])[^'"\r\n]+\2)[ \t]*;?[ \t]*(?:\/\/[^\r\n]*)?[ \t]*$/gm,
        '',
      )
      .replace(/```[\s\S]*?```/g, ''),
  )
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

export type ClassificationMetadata = { category?: string; tags?: string[] };
export type ClassificationField = 'category' | 'tags';

function uniqueLabels(values: (string | undefined)[]) {
  const unique = new Map<string, string>();
  for (const value of values) {
    const label = value?.trim();
    if (label && !unique.has(categoryKey(label))) unique.set(categoryKey(label), label);
  }
  return [...unique.values()];
}

// Read one semantic field without treating category and tags as aliases.
export function filterValues(data: ClassificationMetadata, field: ClassificationField) {
  return uniqueLabels(field === 'category' ? [data.category] : (data.tags ?? []));
}

// 🏷️ HELPER 6: Classification Values
// Returns the primary category and secondary tags together where a feature needs all facets.
export function classificationValues(data: ClassificationMetadata) {
  return uniqueLabels([data.category, ...(data.tags ?? [])]);
}

export function classificationOptions(
  entries: ClassificationMetadata[],
  field: ClassificationField,
) {
  const unique = new Map<string, string>();
  for (const entry of entries) {
    for (const label of filterValues(entry, field)) {
      if (!unique.has(categoryKey(label))) unique.set(categoryKey(label), label);
    }
  }
  return [...unique.values()].sort();
}

// 🏷️ HELPER 6b: Card Label
// The primary category is the pill; the first distinct tag remains the plain-text label.
export function displayLabel(data: ClassificationMetadata) {
  const category = data.category?.trim() || undefined;
  const firstTag = data.tags?.map((tag) => tag.trim()).find(Boolean);
  const tag =
    firstTag && (!category || categoryKey(firstTag) !== categoryKey(category))
      ? firstTag
      : undefined;
  return { category, tag };
}

// 🎯 HELPER 7: Filter Matcher
// Checks whether a value matches the visitor's selected filter.
export function matchesFilter(values: string[], selected: string) {
  return !selected || values.some((value) => categoryKey(value) === categoryKey(selected));
}

// Prefer the canonical query parameter when present; otherwise read one legacy alias.
export function selectedFilterValue(
  searchParams: URLSearchParams,
  filterParam: string,
  legacyParam?: string,
) {
  if (searchParams.has(filterParam)) return searchParams.get(filterParam) ?? '';
  return legacyParam ? (searchParams.get(legacyParam) ?? '') : '';
}

// New filter interactions write only the canonical parameter and retire its alias.
export function updateFilterSearchParams(
  searchParams: URLSearchParams,
  filterParam: string,
  value: string,
  legacyParam?: string,
) {
  if (value) searchParams.set(filterParam, value);
  else searchParams.delete(filterParam);
  if (legacyParam) searchParams.delete(legacyParam);
}
