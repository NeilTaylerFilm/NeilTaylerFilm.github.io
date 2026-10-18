import assert from 'node:assert/strict';
import test from 'node:test';
import { photographyPost, slugify, uploadedPhotos } from '../scripts/new-photography-post.mjs';

const first = 'https://images.example/photos/0123456789abcdef0123456789abcdef-2560.jpeg';
const second = 'https://images.example/photos/fedcba9876543210fedcba9876543210-2560.jpeg';
const registry = {
  [first]: { width: 2560, height: 1708 },
  [second]: { width: 2560, height: 1708 },
};

test('post command accepts only a completed upload with registered image dimensions', () => {
  assert.deepEqual(
    uploadedPhotos(
      `# Uploaded photos\nImage address: ${first}\nImage address: ${second}\n`,
      registry,
    ),
    [
      { src: first, width: 2560, height: 1708 },
      { src: second, width: 2560, height: 1708 },
    ],
  );
  assert.throws(() => uploadedPhotos(`# Upload in progress\n`, registry), /incomplete/);
  assert.throws(() => uploadedPhotos(`# Uploaded photos\n`, registry, true), /upload is running/);
  assert.throws(
    () => uploadedPhotos(`# Uploaded photos\nImage address: ${first}`, {}),
    /missing dimensions in the image registry/,
  );
});

test('post command makes a safe filename and a draft with every uploaded photo', () => {
  assert.equal(slugify('Mát & Louise'), 'mat-and-louise');
  const post = JSON.parse(
    photographyPost(
      'Mát & Louise',
      '2026-10-14',
      uploadedPhotos(
        `# Uploaded photos\nImage address: ${first}\nImage address: ${second}\n`,
        registry,
      ),
    ).split('---')[1],
  );
  assert.equal(post.draft, true);
  assert.equal(post.category, 'Behind The Scenes');
  assert.equal('type' in post, false);
  assert.equal(post.coverImage, first);
  assert.deepEqual(
    post.images.map(({ src }) => src),
    [first, second],
  );
  assert.deepEqual(
    post.images.map(({ width, height }) => [width, height]),
    [
      [2560, 1708],
      [2560, 1708],
    ],
  );
});
