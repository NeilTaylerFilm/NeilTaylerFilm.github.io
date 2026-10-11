import test from 'node:test';
import assert from 'node:assert/strict';
import {
  balanceTwoRows,
  isOrphan,
  planLastRows,
  rowFill,
  rowHeight,
} from '../src/scripts/justified-grid.ts';

const near = (actual, expected, epsilon = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} is not ${expected}`);

test('rowHeight is the height at which the photos exactly fill the width', () => {
  near(rowHeight([1.5, 1.5], 606, 6), 200);
  near(rowHeight([2], 400, 6), 200);
});

test('rowFill is the share of the width taken at the target height', () => {
  near(rowFill([1.5, 1.5], 200, 606, 6), 1);
  near(rowFill([1], 100, 400, 6), 0.25);
});

test('isOrphan flags rows under 60% full or with fewer than 3 photos', () => {
  assert.equal(isOrphan([1.5, 1.5, 1.5], 200, 1000, 6), false);
  assert.equal(isOrphan([1.5, 1.5], 200, 700, 6), true);
  assert.equal(isOrphan([1, 1, 1], 200, 2000, 6), true);
  assert.equal(isOrphan([1, 1, 1, 1], 200, 1000, 6), false);
});

test('balanceTwoRows fills both rows and picks the split closest to the target height', () => {
  const ratios = [1.5, 1.5, 1.5, 1.5, 1.5, 1.5];
  const best = balanceTwoRows(ratios, 200, 906, 6);
  assert.equal(best.split, 3);
  near(best.heights[0], rowHeight(ratios.slice(0, 3), 906, 6));
  near(best.heights[1], best.heights[0]);
  assert.ok(best.deviation < 0.01);
  assert.equal(balanceTwoRows([1, 2], 200, 600, 6).split, 1);
});

test('planLastRows leaves a healthy last row alone', () => {
  const plan = planLastRows([1.5, 1.5, 1.5], [1.5, 1.5, 1.5], 200, 200, 1000, 6);
  assert.deepEqual(plan, { kind: 'none' });
});

test('planLastRows merges a short row only when both rows stay within 15% of target', () => {
  // 6 photos at ratio 1.5 over 906px: two rows of 3 sit exactly at the 200px target.
  const merge = planLastRows([1.5, 1.5, 1.5, 1.5], [1.5, 1.5], 200, 200, 906, 6);
  assert.equal(merge.kind, 'merge');
  assert.equal(merge.split, 3);
});

test('planLastRows leaves a short row unstretched when merging would distort it', () => {
  // A lone photo plus a full row would merge into two rows far taller than the target.
  const plan = planLastRows([1.5, 1.5, 1.5], [1.5], 200, 200, 906, 6);
  assert.equal(plan.kind, 'unstretch');
  assert.equal(plan.height, 200);
});

test('unstretched height never exceeds what fits in the container', () => {
  const plan = planLastRows([1.5, 1.5, 1.5], [3], 400, 200, 700, 6);
  assert.equal(plan.kind, 'unstretch');
  near(plan.height, rowHeight([3], 700, 6));
});
