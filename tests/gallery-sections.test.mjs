// ==========================================
// 🧪 GALLERY CHAPTER GROUPING TEST (tests/gallery-sections.test.mjs)
// ==========================================
// This test makes sure your photo albums divide into chapters properly!
// When you add chapter headings like "Day 01 - Bangkok" or "Day 02 - Chiang Mai":
// 1. Every single photograph stays in exact chronological order.
// 2. Zero photos get dropped or misplaced.
// 3. Photo counters and grid indexes start at the exact right picture.

// Tests gallerySections grouping of images by section headings
// --- BORROWED TOOLS (Imports) ---
// test: Node.js built-in test runner.
import test from 'node:test';
// assert: Node.js strict assertion library.
import assert from 'node:assert/strict';
// gallerySections: The chapter organizing helper function we are testing!
import { gallerySections } from '../src/lib/gallery-sections.ts';

// 📸 TEST: Photo order and chapter headers must remain 100% faithful
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
