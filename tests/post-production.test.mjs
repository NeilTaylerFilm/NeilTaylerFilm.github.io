// ==========================================
// 🧪 FILM & VIDEO LINK VALIDATION TEST (tests/post-production.test.mjs)
// ==========================================
// This test ensures video players and related blog links work reliably!
// 1. YouTube & Vimeo URLs turn into clean, privacy-friendly embeds (youtube-nocookie.com).
// 2. Dangerous or broken links are blocked for security.
// 3. Related blog post links only connect to published articles, never drafts.

// Tests post-production video embeds and blog link validation
import test from 'node:test';
import assert from 'node:assert/strict';
import { videoEmbedUrl, linkedBlogUrl } from '../src/lib/post-production.ts';

// 🎬 TEST: Embed URLs and blog connections must be safe and valid
test('film embeds and blog links accept supported sources and published posts only', () => {
  for (const url of [
    'https://www.youtube.com/watch?v=HAkxnRaTW2Q',
    'https://youtu.be/HAkxnRaTW2Q',
    'https://www.youtube-nocookie.com/embed/HAkxnRaTW2Q',
  ]) {
    assert.equal(
      videoEmbedUrl(url),
      'https://www.youtube-nocookie.com/embed/HAkxnRaTW2Q?rel=0&autoplay=1',
    );
  }
  assert.equal(
    videoEmbedUrl('https://vimeo.com/123456'),
    'https://player.vimeo.com/video/123456?autoplay=1',
  );
  for (const url of [
    'https://evil.example/?v=HAkxnRaTW2Q',
    'javascript:alert(1)',
    'broken',
    undefined,
  ])
    assert.equal(videoEmbedUrl(url), undefined);
  const published = new Set(['a-song-to-be-murdered-by']);
  assert.equal(
    linkedBlogUrl('a-song-to-be-murdered-by', published),
    '/blog/a-song-to-be-murdered-by/',
  );
  assert.equal(linkedBlogUrl(undefined, published), undefined);
  assert.equal(linkedBlogUrl('missing-or-draft', published), undefined);
});
