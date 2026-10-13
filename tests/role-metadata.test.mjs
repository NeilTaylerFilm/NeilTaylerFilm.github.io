import test from 'node:test';
import assert from 'node:assert/strict';
import { roleMetadataSchema } from '../src/lib/role-metadata.ts';

test('role metadata is optional and accepts ordered arrays of non-empty strings', () => {
  assert.equal(roleMetadataSchema.safeParse(undefined).success, true);
  assert.deepEqual(roleMetadataSchema.parse([]), []);
  assert.deepEqual(roleMetadataSchema.parse(['Editor', 'Colourist', 'Sound Designer']), [
    'Editor',
    'Colourist',
    'Sound Designer',
  ]);
});

test('role metadata rejects invalid types and empty role names', () => {
  for (const value of [null, '', 'Editor', 3, [''], ['   '], ['Editor', null]]) {
    assert.equal(roleMetadataSchema.safeParse(value).success, false, JSON.stringify(value));
  }
});
