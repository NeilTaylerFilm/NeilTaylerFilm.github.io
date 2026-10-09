// ==========================================
// 🧪 CLOUDFLARE IMAGE GATEWAY TEST (tests/image-worker.test.mjs)
// ==========================================
// This test suite acts like an ethical security hacker testing your website!
// It verifies:
// 1. Security Lock: Attackers cannot upload files or view private files outside photos/.
// 2. Picture Streaming: Photographs, sizes, and ETags download cleanly to browsers.
// 3. Cache Rules: 1-year browser caching only applies to content-hashed files!

// Tests Cloudflare image worker gateway for security and caching
// --- BORROWED TOOLS (Imports) ---
// test: Node.js built-in test runner.
import test from 'node:test';
// assert: Node.js strict assertion library.
import assert from 'node:assert/strict';
// worker: The Cloudflare image worker butler we are testing!
import worker from '../cloudflare/image-worker.mjs';

// 🔒 TEST 1: Security guards stop bad URLs and write attempts before touching R2
test('image gateway blocks writes and non-public objects without reading R2', async () => {
  const env = {
    IMAGES: {
      get() {
        throw Error('Unexpected read');
      },
    },
  };
  for (const path of [
    '/',
    '/private.jpg',
    '/photos/secrets.txt',
    '/photos/test.svg',
    '/photos/%2e%2e/private.jpg',
  ]) {
    assert.equal(
      (await worker.fetch(new Request('https://images.example' + path), env)).status,
      404,
    );
  }
  assert.equal(
    (
      await worker.fetch(
        new Request('https://images.example/photos/a.jpg', { method: 'PUT', body: 'x' }),
        env,
      )
    ).status,
    405,
  );
});

// ⚡ TEST 2: Valid image requests stream data with correct Content-Type and headers
test('image gateway streams images, serves HEAD metadata, and handles missing files', async () => {
  const object = { size: 3, httpEtag: '"abc"', body: 'abc' };
  const calls = [];
  const env = {
    IMAGES: {
      async get(key) {
        calls.push(key);
        return key.endsWith('missing.jpg') ? null : object;
      },
      async head(key) {
        calls.push(key);
        return object;
      },
    },
  };
  const response = await worker.fetch(
    new Request('https://images.example/photos/london/river.webp'),
    env,
  );
  assert.equal(await response.text(), 'abc');
  assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.equal(response.headers.get('etag'), '"abc"');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const head = await worker.fetch(
    new Request('https://images.example/photos/a.jpg', { method: 'HEAD' }),
    env,
  );
  assert.equal(await head.text(), '');
  assert.equal(head.headers.get('content-length'), '3');
  assert.equal(
    (await worker.fetch(new Request('https://images.example/photos/missing.jpg'), env)).status,
    404,
  );
  assert.equal(calls.length, 3);
});

test('only content-hashed photos receive immutable caching', async () => {
  const object = { size: 4, httpEtag: '"test"', body: 'test' };
  const env = { IMAGES: { get: async () => object, head: async () => object } };
  for (const method of ['GET', 'HEAD']) {
    for (const [name, expected] of [
      ['a'.repeat(32) + '-480.webp', 'public, max-age=31536000, immutable'],
      ['test.webp', 'public, max-age=86400'],
    ]) {
      const response = await worker.fetch(
        new Request(`https://example.com/photos/${name}`, { method }),
        env,
      );
      assert.equal(response.headers.get('cache-control'), expected);
      assert.equal(await response.text(), method === 'HEAD' ? '' : 'test');
    }
  }
});
