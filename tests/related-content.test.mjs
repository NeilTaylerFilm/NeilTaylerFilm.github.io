import test from 'node:test';
import assert from 'node:assert/strict';
import { relatedContentIndex, relatedContentKey } from '../src/lib/related-content.ts';

function entry(id, data = {}, collection = 'photography') {
  return {
    id,
    collection,
    data: { title: id, ...data },
  };
}

function recommendationsFor(items, id, collection = 'photography') {
  return relatedContentIndex(items).get(`${collection}:${id}`) ?? [];
}

test('returns the top three alternatives and fills slots without a similarity cutoff', () => {
  const current = entry('current', { title: 'A Quiet Day' });
  const candidates = [
    entry('one', { title: 'Unrelated One' }),
    entry('two', { title: 'Unrelated Two' }),
    entry('three', { title: 'Unrelated Three' }),
    entry('four', { title: 'Unrelated Four' }),
  ];

  const result = recommendationsFor([current, ...candidates], 'current');

  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map(({ id }) => id),
    ['four', 'one', 'three'],
  );
  assert.ok(result.every((candidate) => candidate.id !== current.id));
});

test('strong title, tag, and category signals rank above weaker candidates', () => {
  const current = entry('20250317-for-king-and-country-day-01', {
    title: 'For King & Country - Day 01',
    category: 'Behind The Scenes',
    tags: ['Music Video'],
    date: new Date('2025-03-17'),
  });
  const sameProduction = entry('20250318-for-king-and-country-day-02', {
    title: 'For King & Country - Day 02',
    category: 'Behind The Scenes',
    tags: ['Music Video'],
    date: new Date('2025-03-18'),
  });
  const sameCategory = entry('other-behind-the-scenes', {
    title: 'Different Project',
    category: 'Behind The Scenes',
    date: new Date('2025-03-16'),
  });
  const sameDateMarkerOnly = entry('different-series-day-01', {
    title: 'Another Production - Day 01',
    category: 'Concert',
    date: new Date('2025-03-17'),
  });

  assert.deepEqual(
    recommendationsFor([current, sameDateMarkerOnly, sameCategory, sameProduction], current.id).map(
      ({ id }) => id,
    ),
    [sameProduction.id, sameCategory.id, sameDateMarkerOnly.id],
  );
});

test('shared installment numbers and generic media words do not create title matches', () => {
  const current = entry('current', { title: 'Behind The Scenes - Day 01' });
  const unrelated = entry('unrelated', { title: 'Behind the Scenes - Day 02' });
  const result = recommendationsFor([current, unrelated], current.id);

  assert.deepEqual(
    result.map(({ id }) => id),
    [unrelated.id],
  );
});

test('shared tags and roles are normalized and category remains an independent signal', () => {
  const current = entry(
    'current',
    {
      title: 'Current Work',
      category: 'Explainer',
      tags: ['Colour Grading', 'YouTube'],
      role: ['Editor', 'Colourist'],
    },
    'postProduction',
  );
  const sameMetadata = entry(
    'same-metadata',
    {
      title: 'Different Work',
      category: ' explainer ',
      tags: [' youtube ', 'Colour Grading', 'YouTube'],
      role: ['Colourist', 'Editor'],
    },
    'postProduction',
  );
  const categoryOnly = entry(
    'category-only',
    { title: 'Another Work', category: 'Explainer' },
    'postProduction',
  );
  const noMatch = entry('no-match', { title: 'Untitled Work' }, 'postProduction');

  assert.deepEqual(
    recommendationsFor(
      [current, noMatch, categoryOnly, sameMetadata],
      current.id,
      'postProduction',
    ).map(({ id }) => id),
    [sameMetadata.id, categoryOnly.id, noMatch.id],
  );
});

test('returns fewer results when fewer candidates exist and does not return duplicates or self', () => {
  const current = entry('current', { title: 'Current' });
  const alternative = entry('alternative', { title: 'Alternative' });
  const duplicateAlternative = entry('alternative', { title: 'Duplicate entry' });

  const result = recommendationsFor(
    [current, alternative, duplicateAlternative, current],
    current.id,
  );

  assert.deepEqual(
    result.map(({ id }) => id),
    [alternative.id],
  );
});

test('date proximity breaks equal scores, then stable identity breaks remaining ties', () => {
  const current = entry('current', {
    title: 'Current',
    category: 'Travel',
    date: new Date('2025-06-01'),
  });
  const nearby = entry('z-nearby', {
    title: 'Different',
    category: 'Travel',
    date: new Date('2025-06-02'),
  });
  const distant = entry('a-distant', {
    title: 'Other',
    category: 'Travel',
    date: new Date('2025-06-20'),
  });
  const sameDistanceLaterId = entry('b-same-distance', {
    title: 'One More',
    category: 'Travel',
    date: new Date('2025-05-31'),
  });

  assert.deepEqual(
    recommendationsFor([current, distant, sameDistanceLaterId, nearby], current.id).map(
      ({ id }) => id,
    ),
    [sameDistanceLaterId.id, nearby.id, distant.id],
  );
});

test('missing metadata and incomparable dates are safe and deterministically ordered', () => {
  const current = entry('current', { title: 'Current', date: 'invalid' });
  const zebra = entry('zebra', {});
  const alpha = entry('alpha', { tags: null, role: undefined, year: 'not-a-year' });

  assert.deepEqual(
    recommendationsFor([current, zebra, alpha], current.id).map(({ id }) => id),
    ['alpha', 'zebra'],
  );
});

test('a mixed-date score tie uses stable identity regardless of input order', () => {
  const current = entry('current', { title: 'Current', date: '2025-06-01' });
  const candidates = [
    entry('a-distant', { title: 'First', date: '2025-12-31' }),
    entry('b-undated', { title: 'Second' }),
    entry('c-nearby', { title: 'Third', date: '2025-06-02' }),
  ];
  const permutations = [
    candidates,
    [candidates[0], candidates[2], candidates[1]],
    [candidates[1], candidates[0], candidates[2]],
    [candidates[1], candidates[2], candidates[0]],
    [candidates[2], candidates[0], candidates[1]],
    [candidates[2], candidates[1], candidates[0]],
  ];

  for (const permutation of permutations) {
    assert.deepEqual(
      recommendationsFor([current, ...permutation], current.id).map(({ id }) => id),
      ['a-distant', 'b-undated', 'c-nearby'],
    );
  }
});

test('the same content ID in different collections has distinct identity', () => {
  const blog = entry('same-id', { title: 'Blog Entry' }, 'blog');
  const photography = entry('same-id', { title: 'Photo Entry' }, 'photography');
  const index = relatedContentIndex([blog, photography]);

  assert.notEqual(relatedContentKey(blog), relatedContentKey(photography));
  assert.equal(index.get('blog:same-id')?.[0], photography);
  assert.equal(index.get('photography:same-id')?.[0], blog);
});

test('one shared engine accepts each of the three collection contracts', () => {
  const entries = [
    entry('blog', { title: 'Camera Review', category: 'Review', tags: ['Photography'] }, 'blog'),
    entry(
      'photo',
      { title: 'Camera Behind The Scenes', category: 'Behind The Scenes', date: '2025-02-01' },
      'photography',
    ),
    entry(
      'post-production',
      { title: 'Camera Explainer', category: 'Explainer', role: ['Editor'], year: 2025 },
      'postProduction',
    ),
  ];

  for (const item of entries) {
    assert.ok(relatedContentIndex([item]).has(relatedContentKey(item)));
    assert.deepEqual(recommendationsFor([item], item.id, item.collection), []);
  }
});
