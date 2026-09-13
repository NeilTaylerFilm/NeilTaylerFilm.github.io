import test from 'node:test';
import assert from 'node:assert/strict';
import { excerpt, isoDate, categoryKey, comparators } from '../src/lib/feed.ts';

test('dates remain ISO dates regardless of local time zone', () => {
  assert.equal(isoDate(new Date('2026-09-13')), '2026-09-13');
});
test('manual excerpts win; automatic previews remove Markdown markup and image paths', () => {
  assert.equal(excerpt('Ignored', '  A chosen introduction.  '), 'A chosen introduction.');
  assert.equal(
    excerpt(
      '# Looking\n\nA **small** [idea](/about/). ![Photo](/image.jpg)\n```js\nsecretCode();\n```',
    ),
    'Looking A small idea.',
  );
  assert.equal(excerpt(), '');
  assert.ok(excerpt('A short sentence. '.repeat(50)).length <= 330);
});
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
