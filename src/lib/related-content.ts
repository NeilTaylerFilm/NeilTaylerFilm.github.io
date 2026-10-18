/**
 * Build-time related-content ranking shared by the site's content collections.
 *
 * The collections already share title/category/tags. Section-specific fields
 * stay optional, so Post Production role metadata can contribute without
 * requiring adapters or changes to authored frontmatter.
 */
export interface RelatedContentEntry {
  id: string;
  collection?: string;
  data: {
    title: string;
    category?: string | null;
    tags?: readonly string[] | null;
    role?: readonly string[] | null;
    date?: Date | string | number | null;
    year?: string | number | null;
  };
}

export const DEFAULT_RELATED_CONTENT_COUNT = 3;

const SCORE = {
  sharedTag: 16,
  maxSharedTags: 2,
  sharedTitleTerm: 12,
  maxSharedTitleTerms: 3,
  sharedRole: 2,
  maxSharedRoles: 1,
  sameCategory: 4,
} as const;

// These words describe common syntax or media formats, not a specific subject.
// Installment markers and their adjacent numbers are handled separately below.
const TITLE_STOP_WORDS = new Set([
  'a',
  'about',
  'after',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'this',
  'to',
  'was',
  'were',
  'with',
  'your',
  'my',
  'our',
  'vs',
  'behind',
  'bts',
  'chapter',
  'day',
  'days',
  'episode',
  'film',
  'films',
  'live',
  'music',
  'part',
  'photography',
  'post',
  'preview',
  'production',
  'project',
  'projects',
  'recording',
  'review',
  'reviews',
  'scenes',
  'session',
  'short',
  'video',
  'videos',
  'vol',
  'volume',
]);

const INSTALLMENT_MARKERS = new Set(['chapter', 'day', 'episode', 'part', 'vol', 'volume']);

const NUMBER_WORDS = new Set([
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
  'twentieth',
]);

type PreparedEntry<T extends RelatedContentEntry> = {
  entry: T;
  key: string;
  category?: string;
  tags: Set<string>;
  roles: Set<string>;
  titleTerms: Set<string>;
  timestamp?: number;
};

function cleanLabel(value: string | null | undefined) {
  const label = value?.trim().toLocaleLowerCase('en');
  return label || undefined;
}

function uniqueLabels(values: readonly (string | null | undefined)[] | null = []) {
  return new Set((values ?? []).map(cleanLabel).filter((value): value is string => Boolean(value)));
}

function titleTerms(title: string) {
  const normalized = title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/&/g, ' and ')
    .toLocaleLowerCase('en');
  const tokens = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];

  return new Set(
    tokens.filter((token, index) => {
      if (/^\d+$/.test(token) || TITLE_STOP_WORDS.has(token)) return false;
      const previous = tokens[index - 1];
      const next = tokens[index + 1];
      const followsInstallmentMarker = previous && INSTALLMENT_MARKERS.has(previous);
      const precedesInstallmentMarker = next && INSTALLMENT_MARKERS.has(next);
      if (NUMBER_WORDS.has(token) && (followsInstallmentMarker || precedesInstallmentMarker)) {
        return false;
      }
      return token.length >= 2;
    }),
  );
}

function timestamp(data: RelatedContentEntry['data']): number | undefined {
  const date = data.date;
  if (date instanceof Date) {
    const value = date.getTime();
    if (Number.isFinite(value)) return value;
  } else if (typeof date === 'number' && Number.isFinite(date)) {
    return date;
  } else if (typeof date === 'string') {
    const value = Date.parse(date);
    if (Number.isFinite(value)) return value;
  }

  const year = data.year?.toString().trim();
  if (year && /^\d{4}$/.test(year)) {
    const value = Date.parse(`${year}-01-01`);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

/** Stable identity across collections, including the same ID in two sections. */
export function relatedContentKey(entry: Pick<RelatedContentEntry, 'id' | 'collection'>) {
  return `${entry.collection ?? ''}:${entry.id}`;
}

function prepare<T extends RelatedContentEntry>(entry: T): PreparedEntry<T> {
  return {
    entry,
    key: relatedContentKey(entry),
    category: cleanLabel(entry.data.category),
    tags: uniqueLabels(entry.data.tags),
    roles: uniqueLabels(entry.data.role),
    titleTerms: titleTerms(entry.data.title),
    timestamp: timestamp(entry.data),
  };
}

function overlapCount(first: Set<string>, second: Set<string>, limit: number) {
  let matches = 0;
  for (const value of first) {
    if (second.has(value) && ++matches >= limit) return limit;
  }
  return matches;
}

function score<T extends RelatedContentEntry>(
  current: PreparedEntry<T>,
  candidate: PreparedEntry<T>,
) {
  const sameCategory = current.category && current.category === candidate.category;
  return (
    overlapCount(current.tags, candidate.tags, SCORE.maxSharedTags) * SCORE.sharedTag +
    overlapCount(current.titleTerms, candidate.titleTerms, SCORE.maxSharedTitleTerms) *
      SCORE.sharedTitleTerm +
    overlapCount(current.roles, candidate.roles, SCORE.maxSharedRoles) * SCORE.sharedRole +
    (sameCategory ? SCORE.sameCategory : 0)
  );
}

/**
 * Rank each entry against one already-eligible content-section cohort.
 *
 * Publication rules deliberately remain in src/lib/content.ts; this function
 * never reads draft flags and never applies a similarity cutoff. Consequently
 * the best available entries fill up to `count` slots, even with score zero.
 */
export function relatedContentIndex<T extends RelatedContentEntry>(
  entries: readonly T[],
  count = DEFAULT_RELATED_CONTENT_COUNT,
) {
  const maxResults = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const distinctEntries = new Map<string, T>();
  for (const entry of entries) {
    const key = relatedContentKey(entry);
    if (!distinctEntries.has(key)) distinctEntries.set(key, entry);
  }

  const preparedEntries = [...distinctEntries.values()].map(prepare);
  const recommendations = new Map<string, T[]>();

  for (const current of preparedEntries) {
    if (maxResults === 0) {
      recommendations.set(current.key, []);
      continue;
    }

    const scoredCandidates = preparedEntries
      .filter((candidate) => candidate.key !== current.key)
      .map((candidate) => ({ candidate, score: score(current, candidate) }))
      .sort((first, second) => second.score - first.score);

    const orderedCandidates: typeof scoredCandidates = [];
    for (let start = 0; start < scoredCandidates.length;) {
      let end = start + 1;
      while (
        end < scoredCandidates.length &&
        scoredCandidates[end].score === scoredCandidates[start].score
      ) {
        end += 1;
      }

      const tied = scoredCandidates.slice(start, end);
      const comparableDates =
        current.timestamp !== undefined &&
        tied.every(({ candidate }) => candidate.timestamp !== undefined);

      tied.sort((first, second) => {
        if (comparableDates) {
          const firstDistance = Math.abs(current.timestamp! - first.candidate.timestamp!);
          const secondDistance = Math.abs(current.timestamp! - second.candidate.timestamp!);
          if (firstDistance !== secondDistance) return firstDistance - secondDistance;
        }

        return first.candidate.key < second.candidate.key
          ? -1
          : first.candidate.key > second.candidate.key
            ? 1
            : 0;
      });

      orderedCandidates.push(...tied);
      start = end;
    }

    const ranked = orderedCandidates.slice(0, maxResults).map(({ candidate }) => candidate.entry);

    recommendations.set(current.key, ranked);
  }

  return recommendations;
}
