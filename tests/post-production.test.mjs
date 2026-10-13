// ==========================================
// 🧪 FILM & VIDEO LINK VALIDATION TEST (tests/post-production.test.mjs)
// ==========================================
// This test ensures video players and related blog links work reliably!
// 1. YouTube & Vimeo URLs turn into clean, privacy-friendly embeds (youtube-nocookie.com).
// 2. Dangerous or broken links are blocked for security.
// 3. Related blog post links only connect to published articles, never drafts.

// Tests post-production video embeds and blog link validation
// --- BORROWED TOOLS (Imports) ---
// test: Node.js built-in test runner.
import test from 'node:test';
// assert: Node.js strict assertion library.
import assert from 'node:assert/strict';
// videoEmbedUrl, linkedBlogUrl: Helpers that build video players and check blog links.
import {
  videoEmbedUrl,
  linkedBlogUrl,
  roleLine,
  validateFeaturedProjectReferences,
} from '../src/lib/post-production.ts';
import { projectLinkForSlide } from '../src/lib/project-links.ts';

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

test('project roles preserve order and use subtitles only as a fallback', () => {
  assert.equal(
    roleLine(['Editor', 'Colourist', 'Sound Designer'], 'Legacy subtitle'),
    'Editor · Colourist · Sound Designer',
  );
  assert.equal(roleLine([], '  Freeform subtitle  '), 'Freeform subtitle');
  assert.equal(roleLine(undefined, undefined), undefined);
});

test('featured project links resolve labels independently for each slide', () => {
  const slides = [
    { project: 'scene-breakdown', projectLabel: 'Read scene breakdown →' },
    { project: 'linked-article' },
    {},
    { project: 'another-article', projectLabel: 'Read film notes →' },
    { project: 'scene-breakdown', projectLabel: 'Read scene breakdown →' },
  ];
  const resolved = slides.map((slide) => projectLinkForSlide(slide, '/post-production/'));

  assert.deepEqual(resolved, [
    {
      href: '/post-production/scene-breakdown/',
      hidden: false,
      label: 'Read scene breakdown →',
    },
    {
      href: '/post-production/linked-article/',
      hidden: false,
      label: 'View project →',
    },
    { href: undefined, hidden: true, label: 'View project →' },
    {
      href: '/post-production/another-article/',
      hidden: false,
      label: 'Read film notes →',
    },
    {
      href: '/post-production/scene-breakdown/',
      hidden: false,
      label: 'Read scene breakdown →',
    },
  ]);
});

test('featured project references must point to published Post Production articles', () => {
  const publishedArticleIds = new Set(['scene-breakdown']);

  assert.doesNotThrow(() =>
    validateFeaturedProjectReferences(
      [{ project: 'scene-breakdown' }, {}, { project: 'scene-breakdown' }],
      publishedArticleIds,
    ),
  );
  assert.throws(
    () => validateFeaturedProjectReferences([{ project: 'missing-article' }], publishedArticleIds),
    /Featured Post Production article "missing-article" is missing or unpublished\./,
  );
  assert.throws(
    () => validateFeaturedProjectReferences([{ project: 'draft-article' }], publishedArticleIds),
    /Featured Post Production article "draft-article" is missing or unpublished\./,
  );
  assert.throws(
    () => validateFeaturedProjectReferences([{ project: '  ' }], publishedArticleIds),
    /Featured Post Production article "  " is missing or unpublished\./,
  );
});
