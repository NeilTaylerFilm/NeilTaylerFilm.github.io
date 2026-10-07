import test from 'node:test';
import assert from 'node:assert/strict';
import { gallerySections } from '../src/lib/gallery-sections.ts';

test('optional day headings preserve every photograph and its order', () => {
  const images = [
    { src: 'a' },
    { src: 'b', section: 'Day 01' },
    { src: 'c' },
    { src: 'd', section: 'Day 02' },
  ];
  const groups = gallerySections(images);
  assert.deepEqual(
    groups.map((g) => [g.heading, g.start, g.images.length]),
    [
      [undefined, 0, 1],
      ['Day 01', 1, 2],
      ['Day 02', 3, 1],
    ],
  );
  assert.deepEqual(
    groups.flatMap((g) => g.images),
    images,
  );
  assert.equal(gallerySections([{ src: 'a' }, { src: 'b' }]).length, 1);
  assert.deepEqual(gallerySections([]), []);
});
