import test from 'node:test';
import assert from 'node:assert/strict';
import {
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeVideoId,
  youtubeWatchUrl,
} from '../src/lib/youtube.ts';
import { gallerySections } from '../src/lib/gallery-sections.ts';

const validId = 'M7lc1UVf-VE';

test('normalizes supported YouTube IDs and HTTPS share URLs', () => {
  for (const source of [
    validId,
    `https://www.youtube.com/watch?v=${validId}&si=share-token`,
    `https://youtube.com/embed/${validId}`,
    `https://www.youtube.com/shorts/${validId}?feature=share`,
    `https://m.youtube.com/live/${validId}`,
    `https://youtu.be/${validId}?t=4`,
  ]) {
    assert.equal(youtubeVideoId(source), validId, source);
  }
});

test('rejects unsafe or ambiguous YouTube sources', () => {
  for (const source of [
    'http://youtu.be/M7lc1UVf-VE',
    'https://youtube.com.evil.example/watch?v=M7lc1UVf-VE',
    'https://evil.example/embed/M7lc1UVf-VE',
    'https://user:pass@youtube.com/watch?v=M7lc1UVf-VE',
    'https://youtube.com:444/watch?v=M7lc1UVf-VE',
    'https://youtube.com/embed/M7lc1UVf-VE/extra',
    'https://youtu.be/M7lc1UVf-VE/extra',
    'https://youtube.com/watch?v=M7lc1UVf-VE&v=aaaaaaaaaaa',
    'https://youtube.com/watch?v=bad-id',
    'https://youtube.com/embed/M7lc1UVf-VE#fragment',
    'M7lc1UVf-VE<script>',
  ]) {
    assert.equal(youtubeVideoId(source), undefined, source);
  }
});

test('derives privacy-enhanced embed, YouTube fallback, and thumbnail URLs from an ID', () => {
  const embed = new URL(youtubeEmbedUrl(validId));
  assert.equal(embed.origin, 'https://www.youtube-nocookie.com');
  assert.equal(embed.pathname, `/embed/${validId}`);
  assert.equal(embed.searchParams.get('autoplay'), '1');
  assert.equal(embed.searchParams.get('controls'), '1');
  assert.equal(embed.searchParams.get('playsinline'), '1');
  assert.equal(embed.searchParams.get('rel'), '0');
  assert.equal(youtubeWatchUrl(validId), `https://www.youtube.com/watch?v=${validId}`);
  assert.equal(youtubeThumbnailUrl(validId), `https://i.ytimg.com/vi/${validId}/hqdefault.jpg`);
  assert.throws(() => youtubeEmbedUrl('bad-id'), TypeError);
});

test('gallery section grouping preserves authored order across photos and videos', () => {
  const media = [
    { src: 'photo-1' },
    { videoId: validId, type: 'video', section: 'Day 2' },
    { videoId: 'abcdefghijk', type: 'video' },
    { src: 'photo-2' },
  ];
  const sections = gallerySections(media);
  assert.deepEqual(
    sections.flatMap((section) => section.images),
    media,
  );
  assert.deepEqual(
    sections.map((section) => section.start),
    [0, 1],
  );
});
