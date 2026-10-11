import test from 'node:test';
import assert from 'node:assert/strict';
import { portfolioPhotos } from '../src/data/photography-portfolio.ts';
import {
  MAX_ROW_HEIGHT_RATIO,
  MIN_ROW_HEIGHT_RATIO,
  partitionRows,
  targetRowHeightForWidth,
} from '../src/scripts/justified-grid.ts';

const GAP = 6;
const inHeightRange = (height, target) =>
  height >= target * MIN_ROW_HEIGHT_RATIO - 1e-7 && height <= target * MAX_ROW_HEIGHT_RATIO + 1e-7;

function assertPlan(ratios, width, target, plan) {
  let next = 0;
  for (const row of plan.rows) {
    assert.equal(row.start, next, 'rows retain the source order without gaps');
    assert.ok(row.end > row.start);
    assert.equal(row.widths.length, row.end - row.start);
    const rowWidth = row.widths.reduce((sum, itemWidth) => sum + itemWidth, 0);
    const filledWidth = rowWidth + GAP * (row.widths.length - 1);
    assert.ok(Math.abs(filledWidth - width) <= 1, `row width ${filledWidth} differs from ${width}`);
    row.widths.forEach((itemWidth, index) => {
      assert.ok(Math.abs(itemWidth / row.height - ratios[row.start + index]) < 1e-8);
    });
    if (plan.heightRangeSatisfied) assert.ok(inHeightRange(row.height, target));
    next = row.end;
  }
  assert.equal(next, ratios.length, 'all photos belong to a row');
}

function canMeetHeightRange(ratios, width, gap, target) {
  const reachable = Array(ratios.length + 1).fill(false);
  reachable[0] = true;
  for (let end = 1; end <= ratios.length; end++) {
    for (let start = 0; start < end; start++) {
      if (!reachable[start]) continue;
      const height =
        (width - gap * (end - start - 1)) /
        ratios.slice(start, end).reduce((sum, ratio) => sum + ratio, 0);
      if (inHeightRange(height, target)) reachable[end] = true;
    }
  }
  return reachable[ratios.length];
}

function exhaustiveBestCost(ratios, width, gap, target) {
  const candidates = [];
  for (let mask = 0; mask < 2 ** Math.max(0, ratios.length - 1); mask++) {
    const heights = [];
    let start = 0;
    for (let index = 1; index <= ratios.length; index++) {
      if (index === ratios.length || mask & (1 << (index - 1))) {
        const ratioSum = ratios.slice(start, index).reduce((sum, ratio) => sum + ratio, 0);
        heights.push((width - gap * (index - start - 1)) / ratioSum);
        start = index;
      }
    }
    candidates.push({
      heights,
      bounded: heights.every((height) => inHeightRange(height, target)),
      cost: heights.reduce((sum, height) => sum + (height - target) ** 2, 0),
    });
  }
  const bounded = candidates.filter((candidate) => candidate.bounded);
  const eligible = bounded.length ? bounded : candidates;
  return Math.min(...eligible.map((candidate) => candidate.cost));
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

test('dynamic partition minimizes total squared height deviation', () => {
  const ratios = [0.55, 0.8, 1.2, 1.7, 2.3, 0.6];
  const target = 320;
  const plan = partitionRows(ratios, 900, GAP, target);
  const cost = plan.rows.reduce((sum, row) => sum + (row.height - target) ** 2, 0);
  assert.ok(Math.abs(cost - exhaustiveBestCost(ratios, 900, GAP, target)) < 1e-6);
  assert.equal(plan.heightRangeSatisfied, canMeetHeightRange(ratios, 900, GAP, target));
  assertPlan(ratios, 900, target, plan);
});

test('seeded random aspect ratios fill every row for counts 1 through 40', () => {
  const random = seededRandom(0x2f6e2b1);
  const ratios = Array.from({ length: 40 }, () => 0.5 + random() * 1.9);
  for (let count = 1; count <= 40; count++) {
    const photos = ratios.slice(0, count);
    for (const width of [390, 768, 1440]) {
      const target = targetRowHeightForWidth(width);
      const plan = partitionRows(photos, width, GAP, target);
      assertPlan(photos, width, target, plan);
      assert.equal(plan.heightRangeSatisfied, canMeetHeightRange(photos, width, GAP, target));
      if (plan.heightRangeSatisfied)
        assert.ok(plan.rows.every((row) => inHeightRange(row.height, target)));
    }
  }
});

test('real featured photos partition at mobile, tablet, and desktop widths', () => {
  assert.equal(portfolioPhotos.length, 4);
  const ratios = portfolioPhotos.map((photo) => photo.width / photo.height);
  for (const width of [390, 768, 1440]) {
    const target = targetRowHeightForWidth(width);
    const plan = partitionRows(ratios, width, GAP, target);
    assertPlan(ratios, width, target, plan);
    assert.equal(plan.heightRangeSatisfied, canMeetHeightRange(ratios, width, GAP, target));
  }
});

test('tiny sets and extreme frames use the closest full-width layout available', () => {
  const cases = [
    { ratios: [0.5], width: 390 },
    { ratios: [2.4], width: 1440 },
    { ratios: [0.7, 1.9], width: 768 },
    { ratios: [0.6, 1, 1.4], width: 768 },
    { ratios: [2.4, 1.3, 0.5], width: 1440 },
  ];
  for (const { ratios, width } of cases) {
    const target = targetRowHeightForWidth(width);
    const plan = partitionRows(ratios, width, GAP, target);
    assertPlan(ratios, width, target, plan);
    assert.equal(plan.heightRangeSatisfied, canMeetHeightRange(ratios, width, GAP, target));
  }
  const tallPortrait = partitionRows([0.5], 390, GAP, 260);
  assert.equal(tallPortrait.rows[0].height, 780);
  assert.equal(tallPortrait.heightRangeSatisfied, false);
});

test('an impossible panorama does not collapse otherwise valid rows', () => {
  const ratios = [2.4, ...Array.from({ length: 39 }, () => 1.2)];
  const plan = partitionRows(ratios, 320, GAP, 260);

  assert.equal(plan.heightRangeSatisfied, false);
  assert.equal(plan.rows.length, ratios.length);
  assert.ok(plan.rows.every((row, index) => index === 0 || inHeightRange(row.height, 260)));
  assert.ok(plan.rows[0].height < 260 * MIN_ROW_HEIGHT_RATIO);
  assertPlan(ratios, 320, 260, plan);
});

test('seeded 40-photo fallback isolates impossible frames instead of collapsing the grid', () => {
  let state = 0x51f15e;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const ratios = Array.from({ length: 40 }, () => 0.5 + random() * 1.9);

  for (const width of [320, 390]) {
    const plan = partitionRows(ratios, width, GAP, 260);
    assert.equal(plan.heightRangeSatisfied, false);
    assert.ok(
      plan.rows.length > 1,
      'the impossible frames must not collapse all 40 photos into one row',
    );
    assert.ok(plan.rows.some((row) => inHeightRange(row.height, 260)));
    assertPlan(ratios, width, 260, plan);
  }
});
