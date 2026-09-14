import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { photoVariants } from '../scripts/lib/photo-variants.mjs';
import { uploadBudget, inventory } from '../scripts/lib/r2.mjs';

test('R2 budget counts all objects, skips duplicates and stops before the threshold', () => {
  const objects = new Map([
    ['private-object', 70],
    ['photos/existing.jpeg', 20],
  ]);
  const files = [
    { key: 'photos/existing.jpeg', bytes: Buffer.alloc(20) },
    { key: 'photos/new.jpeg', bytes: Buffer.alloc(10) },
  ];
  assert.equal(uploadBudget(objects, files, 100).added, 10);
  assert.equal(uploadBudget(objects, files, 100).pending.length, 1);
  assert.throws(() => uploadBudget(objects, files, 99), /threshold/);
});
test('R2 inventory follows every page', async () => {
  let calls = 0;
  const client = {
    async send(command) {
      calls++;
      if (calls === 1)
        return {
          Contents: [{ Key: 'a', Size: 3 }],
          IsTruncated: true,
          NextContinuationToken: 'next',
        };
      assert.equal(command.input.ContinuationToken, 'next');
      return { Contents: [{ Key: 'b', Size: 4 }], IsTruncated: false };
    },
  };
  assert.deepEqual(
    [...(await inventory(client, 'bucket'))],
    [
      ['a', 3],
      ['b', 4],
    ],
  );
});
test('photo exports rotate, cap longest edge, strip metadata and use repeatable names', async () => {
  const source = await sharp({
    create: { width: 3000, height: 1500, channels: 3, background: '#558899' },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const output = await photoVariants(source, 'https://images.example');
  assert.equal(output.info.height, 2560);
  assert.equal(output.info.width, 1280);
  assert.match(output.reference, /photos\/[a-f0-9]{32}-1280.jpeg$/);
  for (const file of output.files) {
    const metadata = await sharp(file.bytes).metadata();
    assert.ok(metadata.width <= 1280 && metadata.height <= 2560);
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.orientation, undefined);
  }
  assert.equal((await photoVariants(source, 'https://images.example')).reference, output.reference);
  const small = await sharp({
    create: { width: 30, height: 20, channels: 3, background: '#112233' },
  })
    .png()
    .toBuffer();
  const smallResult = await photoVariants(small, 'https://images.example');
  assert.equal(smallResult.files.length, 2);
  assert.equal(smallResult.info.width, 30);
});
