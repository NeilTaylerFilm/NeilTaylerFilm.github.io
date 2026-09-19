import test from 'node:test';
import assert from 'node:assert/strict';
import { videoEmbedUrl, linkedBlogUrl } from '../src/lib/post-production.ts';
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
