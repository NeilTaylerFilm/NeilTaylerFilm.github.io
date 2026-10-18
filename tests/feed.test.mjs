// ==========================================
// 🧪 FEED & DATE LABORATORY TESTS (tests/feed.test.mjs)
// ==========================================
// Think of this file like a robot quality tester in a factory!
// It runs automated checks to guarantee:
// 1. Dates never get mixed up by world timezones (13 Sept is always 13 Sept).
// 2. Blog post summaries (excerpts) strip raw computer code cleanly.
// 3. Category filters handle accents and special characters (like "Café" or "Film / TV").
// 4. Calendar dates reject impossible days like February 30th!

// Tests feed utilities for excerpts, dates, categories and sorting
// --- BORROWED TOOLS (Imports) ---
// test: Node.js built-in test runner.
import test from 'node:test';
// assert: Node.js strict assertion library.
import assert from 'node:assert/strict';
// excerpt, isoDate, categoryKey, comparators: The feed helpers we are testing!
import { excerpt, isoDate, categoryKey, comparators } from '../src/lib/feed.ts';

// 📅 TEST 1: Timezone safety (Dates must not shift when traveling)
test('dates remain ISO dates regardless of local time zone', () => {
  assert.equal(isoDate(new Date('2026-09-13')), '2026-09-13');
});

// ✂️ TEST 2: Summary teasers strip raw Markdown code and keep clean sentences
test('manual excerpts win; automatic previews remove Markdown markup and image paths', () => {
  assert.equal(excerpt('Ignored', '  A chosen introduction.  '), 'A chosen introduction.');
  assert.equal(
    excerpt(
      '# Looking\n\nA **small** [idea](/about/). ![Photo](/image.jpg)\n```js\nsecretCode();\n```',
    ),
    'Looking A small idea.',
  );
  assert.equal(excerpt(), '');
  assert.equal(
    excerpt('First sentence. Second sentence. Third sentence.'),
    'First sentence. Second sentence.',
  );
  assert.ok(excerpt('A short sentence. '.repeat(50)).length <= 330);
});

// 🏷️ TEST 3: Category names support accents, slashes, and ampersands
test('new user-defined categories work, including punctuation and Unicode', () => {
  for (const category of ['Travel', 'Film / TV', 'Café', 'Colour & light']) {
    assert.equal(categoryKey(category), category.toLowerCase());
    assert.equal(
      decodeURIComponent(encodeURIComponent(categoryKey(category))),
      categoryKey(category),
    );
  }
});
test('comparators sort dates and break ties consistently', () => {
  const records = [
    { id: 'c', date: 100 },
    { id: 'b', date: 300 },
    { id: 'a', date: 300 },
  ];
  assert.deepEqual(
    [...records].sort(comparators.newest).map((x) => x.id),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(
    [...records].sort(comparators.oldest).map((x) => x.id),
    ['c', 'a', 'b'],
  );
});

test('photography sorting accepts exact dates, years and undated projects', async () => {
  const { projectTimestamp } = await import('../src/lib/feed.ts');
  assert.equal(projectTimestamp({}), 0);
  assert.equal(projectTimestamp({ year: 2026 }), Date.parse('2026-01-01'));
  assert.equal(
    projectTimestamp({ year: '2026', date: new Date('2026-09-14') }),
    Date.parse('2026-09-14'),
  );
});

test('category and tags remain distinct while both contribute filter values', async () => {
  const { classificationValues, classificationOptions, filterValues, displayLabel, matchesFilter } =
    await import('../src/lib/feed.ts');
  const metadata = {
    category: ' Review ',
    tags: ['Photography', ' Technology ', 'photography', 'Review', 'Film / TV'],
  };
  assert.deepEqual(classificationValues(metadata), [
    'Review',
    'Photography',
    'Technology',
    'Film / TV',
  ]);
  assert.deepEqual(classificationOptions([metadata, { category: 'Travel' }], 'category'), [
    'Review',
    'Travel',
  ]);
  assert.deepEqual(classificationOptions([metadata, { category: 'Travel' }], 'tags'), [
    'Film / TV',
    'Photography',
    'Review',
    'Technology',
  ]);
  assert.deepEqual(filterValues(metadata, 'category'), ['Review']);
  assert.deepEqual(filterValues(metadata, 'tags'), [
    'Photography',
    'Technology',
    'Review',
    'Film / TV',
  ]);
  for (const selected of ['', 'photography', 'technology', 'film / tv', 'review'])
    assert.ok(matchesFilter(classificationValues(metadata), selected));
  assert.equal(matchesFilter(classificationValues(metadata), 'Notebook'), false);
  assert.deepEqual(displayLabel(metadata), { category: 'Review', tag: 'Photography' });
  assert.deepEqual(displayLabel({ category: 'Travel', tags: ['travel', 'Thailand'] }), {
    category: 'Travel',
    tag: undefined,
  });
  assert.deepEqual(classificationValues({}), []);
});

test('category and tag options are trimmed, unique, and sorted from content data', async () => {
  const { classificationOptions } = await import('../src/lib/feed.ts');
  assert.deepEqual(
    classificationOptions(
      [
        { category: ' Travel ', tags: ['Nature'] },
        { category: 'travel' },
        { category: 'Sports' },
        {},
        { category: '' },
      ],
      'tags',
    ),
    ['Nature'],
  );
  assert.deepEqual(
    classificationOptions(
      [
        { category: ' Travel ', tags: ['Nature'] },
        { category: 'travel' },
        { category: 'Sports' },
        {},
        { category: '' },
      ],
      'category',
    ),
    ['Sports', 'Travel'],
  );
});

test('canonical filter parameters win over legacy aliases and new interactions remove aliases', async () => {
  const { selectedFilterValue, updateFilterSearchParams } = await import('../src/lib/feed.ts');
  assert.equal(
    selectedFilterValue(new URLSearchParams('category=Sports&type=Travel'), 'category', 'type'),
    'Sports',
  );
  assert.equal(
    selectedFilterValue(new URLSearchParams('type=Travel'), 'category', 'type'),
    'Travel',
  );
  assert.equal(
    selectedFilterValue(new URLSearchParams('category=&type=Travel'), 'category', 'type'),
    '',
  );

  const params = new URLSearchParams('type=Travel&sort=oldest');
  updateFilterSearchParams(params, 'category', 'travel', 'type');
  assert.equal(params.toString(), 'sort=oldest&category=travel');
  updateFilterSearchParams(params, 'category', '', 'type');
  assert.equal(params.toString(), 'sort=oldest');
});

test('project calendar dates reject ambiguous and impossible input', async () => {
  const { projectDate, projectYear, matchingProjectYear } =
    await import('../src/lib/project-date.ts');
  for (const value of [
    '2026-02-30',
    '2025-02-29',
    '18 July 2026',
    '2026-07-18T00:00:00+02:00',
    2026,
  ]) {
    assert.equal(projectDate.safeParse(value).success, false);
  }
  const date = projectDate.parse('2026-07-18');
  assert.equal(isoDate(date), '2026-07-18');
  assert.equal(isoDate(projectDate.parse('2024-02-29')), '2024-02-29');
  const previousTimezone = process.env.TZ;
  for (const timeZone of ['UTC', 'Pacific/Honolulu', 'Pacific/Auckland']) {
    process.env.TZ = timeZone;
    assert.equal(
      new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(date),
      '18 July 2026',
    );
  }
  if (previousTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = previousTimezone;
  assert.equal(matchingProjectYear({ date, year: 2025 }), false);
  assert.equal(matchingProjectYear({ date, year: '2026' }), true);
  assert.equal(matchingProjectYear({ year: 2025 }), true);
  assert.equal(projectYear.safeParse('0000').success, false);
});
