import test from 'node:test';
import assert from 'node:assert/strict';
import { portfolioPhotos } from '../src/data/photography-portfolio.ts';
import {
  MAX_ROW_HEIGHT_RATIO,
  MIN_ROW_HEIGHT_RATIO,
  partitionRows,
  targetProjectRowHeightForWidth,
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

function assertIncompletePlan(ratios, width, gap, target, plan) {
  let next = 0;
  for (const row of plan.rows) {
    assert.equal(row.start, next, 'rows retain the source order without gaps');
    assert.ok(row.end > row.start);
    assert.equal(row.widths.length, row.end - row.start);
    assert.ok(row.widths.every((itemWidth) => Number.isFinite(itemWidth) && itemWidth > 0));
    assert.ok(row.widths.every((itemWidth) => itemWidth <= width));
    row.widths.forEach((itemWidth, index) => {
      assert.ok(Math.abs(itemWidth / row.height - ratios[row.start + index]) < 1e-8);
    });

    const usedWidth =
      row.widths.reduce((sum, itemWidth) => sum + itemWidth, 0) + gap * (row.widths.length - 1);
    if (row.justified === false) {
      assert.equal(row.end, ratios.length, 'only the final row can be incomplete');
      assert.equal(row.height, target, 'an incomplete final row keeps the target height');
      assert.ok(usedWidth <= width + 1e-7);
    } else {
      assert.ok(Math.abs(usedWidth - width) <= 1e-7);
    }
    if (plan.heightRangeSatisfied) assert.ok(inHeightRange(row.height, target));
    next = row.end;
  }
  assert.equal(next, ratios.length, 'all photos belong to a row');
}

function incompletePlanCost(plan, width, gap, target) {
  let outOfRangePhotos = 0;
  let total = 0;
  for (const row of plan.rows) {
    if (row.justified === false) {
      const usedWidth =
        row.widths.reduce((sum, itemWidth) => sum + itemWidth, 0) + gap * (row.widths.length - 1);
      total += 0.25 * (((width - usedWidth) / width) * target) ** 2;
      continue;
    }
    if (!inHeightRange(row.height, target)) outOfRangePhotos += row.end - row.start;
    total += (row.height - target) ** 2;
  }
  return { outOfRangePhotos, total };
}

function exhaustiveIncompletePlanCost(
  ratios,
  width,
  gap,
  target,
  maxFinalRatio = 1.25,
  slackWeight = 0.25,
) {
  let best;
  for (let mask = 0; mask < 2 ** Math.max(0, ratios.length - 1); mask++) {
    const ranges = [];
    let start = 0;
    let invalid = false;
    let outOfRangePhotos = 0;
    let total = 0;

    for (let end = 1; end <= ratios.length; end++) {
      if (end < ratios.length && !(mask & (1 << (end - 1)))) continue;
      const availableWidth = width - gap * (end - start - 1);
      if (availableWidth <= 0) {
        invalid = true;
        break;
      }
      const height =
        availableWidth / ratios.slice(start, end).reduce((sum, ratio) => sum + ratio, 0);
      ranges.push({ start, end, height });
      start = end;
    }
    if (invalid) continue;

    for (let index = 0; index < ranges.length; index++) {
      const row = ranges[index];
      const count = row.end - row.start;
      if (index < ranges.length - 1) {
        if (!inHeightRange(row.height, target)) outOfRangePhotos += count;
        total += (row.height - target) ** 2;
        continue;
      }

      const finalMax = Math.min(target * MAX_ROW_HEIGHT_RATIO, target * maxFinalRatio);
      if (row.height >= target * MIN_ROW_HEIGHT_RATIO && row.height <= finalMax) {
        total += (row.height - target) ** 2;
        continue;
      }

      const naturalWidth =
        ratios.slice(row.start).reduce((sum, ratio) => sum + ratio * target, 0) + gap * (count - 1);
      if (row.height > finalMax && naturalWidth <= width) {
        total += slackWeight * (((width - naturalWidth) / width) * target) ** 2;
      } else {
        if (!inHeightRange(row.height, target)) outOfRangePhotos += count;
        total += (row.height - target) ** 2;
      }
    }

    const cost = { outOfRangePhotos, total };
    if (
      !best ||
      cost.outOfRangePhotos < best.outOfRangePhotos ||
      (cost.outOfRangePhotos === best.outOfRangePhotos && cost.total < best.total)
    )
      best = cost;
  }
  return best;
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

test('project gallery targets use container-width tiers', () => {
  assert.equal(targetProjectRowHeightForWidth(320), 190);
  assert.equal(targetProjectRowHeightForWidth(539.9), 190);
  assert.equal(targetProjectRowHeightForWidth(540), 250);
  assert.equal(targetProjectRowHeightForWidth(899.9), 250);
  assert.equal(targetProjectRowHeightForWidth(900), 290);
  assert.throws(() => targetProjectRowHeightForWidth(Number.NaN), RangeError);
});

test('single portraits, landscapes, and two-photo groups stay at target height when needed', () => {
  const options = { allowIncompleteFinalRow: true };
  const cases = [
    { ratios: [0.5], width: 1248, target: 290, expectedWidths: [145] },
    { ratios: [3], width: 1248, target: 290, expectedWidths: [870] },
    { ratios: [1, 1], width: 1248, target: 290, expectedWidths: [290, 290] },
  ];

  for (const { ratios, width, target, expectedWidths } of cases) {
    const plan = partitionRows(ratios, width, GAP, target, options);
    assertIncompletePlan(ratios, width, GAP, target, plan);
    assert.equal(plan.rows.length, 1);
    assert.equal(plan.rows[0].justified, false);
    assert.deepEqual(plan.rows[0].widths, expectedWidths);
  }
});

test('three modest photos and four comfortable photos justify to the container edge', () => {
  for (const ratios of [
    [1.2, 1.2, 1.2],
    [1, 1, 1, 1],
  ]) {
    const plan = partitionRows(ratios, 1000, GAP, 250, { allowIncompleteFinalRow: true });
    assertIncompletePlan(ratios, 1000, GAP, 250, plan);
    assert.equal(plan.rows.length, 1);
    assert.equal(plan.rows[0].justified, undefined);
  }
});

test('final-row justification follows the configurable height threshold', () => {
  const width = 1000;
  const target = 200;
  const justifiable = (width - GAP) / (1.24 * target);
  const tooTall = (width - GAP) / (1.26 * target);
  const accepted = partitionRows([justifiable], width, GAP, target, {
    allowIncompleteFinalRow: true,
  });
  const leftAligned = partitionRows([tooTall], width, GAP, target, {
    allowIncompleteFinalRow: true,
  });
  const stricter = partitionRows([justifiable], width, GAP, target, {
    allowIncompleteFinalRow: true,
    maxFinalRowHeightRatio: 1.1,
  });

  assert.equal(accepted.rows[0].justified, undefined);
  assert.equal(leftAligned.rows[0].justified, false);
  assert.equal(stricter.rows[0].justified, false);
  assertIncompletePlan([justifiable], width, GAP, target, accepted);
  assertIncompletePlan([tooTall], width, GAP, target, leftAligned);
  assertIncompletePlan([justifiable], width, GAP, target, stricter);
});

test('dynamic programming compares competing final-row partitions with the slack penalty', () => {
  const cases = [
    { ratios: [0.5, 1.9, 0.7, 2.5, 1.2], width: 840, target: 190 },
    { ratios: [2.2, 0.55, 0.7, 2.6, 1.1, 1.8], width: 1120, target: 250 },
    { ratios: [0.6, 2.4, 1.6, 0.8, 2.1, 0.5, 2.8], width: 1248, target: 290 },
  ];

  for (const { ratios, width, target } of cases) {
    const plan = partitionRows(ratios, width, GAP, target, { allowIncompleteFinalRow: true });
    assertIncompletePlan(ratios, width, GAP, target, plan);
    const actual = incompletePlanCost(plan, width, GAP, target);
    const expected = exhaustiveIncompletePlanCost(ratios, width, GAP, target);
    assert.equal(actual.outOfRangePhotos, expected.outOfRangePhotos);
    assert.ok(Math.abs(actual.total - expected.total) < 1e-5);
  }

  const portrait = partitionRows([0.5], 1248, GAP, 290, { allowIncompleteFinalRow: true });
  const emptyWidth = 1248 - 145;
  const expectedSlackPenalty = 0.25 * ((emptyWidth / 1248) * 290) ** 2;
  assert.ok(
    Math.abs(incompletePlanCost(portrait, 1248, GAP, 290).total - expectedSlackPenalty) < 1e-7,
  );
});

test('extreme aspect ratios and narrow containers never overflow or produce invalid widths', () => {
  const cases = [
    { ratios: [8, 0.08, 0.4, 6, 0.5], width: 320, target: 190 },
    { ratios: [0.5, 0.7, 0.8, 0.65], width: 50, target: 190 },
    {
      ratios: Array.from({ length: 18 }, (_, index) => (index % 2 ? 3.5 : 0.25)),
      width: 1248,
      target: 290,
    },
  ];

  for (const { ratios, width, target } of cases) {
    const plan = partitionRows(ratios, width, GAP, target, { allowIncompleteFinalRow: true });
    assertIncompletePlan(ratios, width, GAP, target, plan);
  }
});

test('invalid dimensions and final-row options fail with clear errors', () => {
  const options = { allowIncompleteFinalRow: true };
  for (const ratio of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
    assert.throws(() => partitionRows([ratio], 400, GAP, 190, options), RangeError);
  assert.throws(() => partitionRows([1], Number.NaN, GAP, 190, options), RangeError);
  assert.throws(() => partitionRows([1], 400, GAP, 0, options), RangeError);
  assert.throws(() => partitionRows([1], 400, GAP, 190, { allowIncompleteFinalRow: 1 }), TypeError);
  assert.throws(
    () =>
      partitionRows([1], 400, GAP, 190, {
        allowIncompleteFinalRow: true,
        maxFinalRowHeightRatio: Infinity,
      }),
    RangeError,
  );
});

test('omitting final-row options preserves the existing partition output', () => {
  const ratios = [0.55, 0.8, 1.2, 1.7, 2.3, 0.6];
  const baseline = partitionRows(ratios, 900, GAP, 320);
  const disabled = partitionRows(ratios, 900, GAP, 320, { allowIncompleteFinalRow: false });
  assert.deepEqual(disabled, baseline);
});
