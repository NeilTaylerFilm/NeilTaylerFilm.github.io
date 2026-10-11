export const MIN_ROW_HEIGHT_RATIO = 0.6;
export const MAX_ROW_HEIGHT_RATIO = 1.6;

export type JustifiedRow = {
  start: number;
  end: number;
  height: number;
  widths: number[];
};

export type JustifiedGridPlan = {
  rows: JustifiedRow[];
  heightRangeSatisfied: boolean;
};

export function targetRowHeightForWidth(width: number) {
  return width < 900 ? 260 : 320;
}

function rowHeight(ratios: number[], start: number, end: number, width: number, gap: number) {
  const availableWidth = width - gap * (end - start - 1);
  const ratioSum = ratios.slice(start, end).reduce((sum, ratio) => sum + ratio, 0);
  return availableWidth / ratioSum;
}

export function partitionRows(
  ratios: number[],
  width: number,
  gap: number,
  target: number,
): JustifiedGridPlan {
  if (!Number.isFinite(width) || width <= 0) throw new RangeError('Grid width must be positive.');
  if (!Number.isFinite(gap) || gap < 0) throw new RangeError('Grid gap must be nonnegative.');
  if (!Number.isFinite(target) || target <= 0)
    throw new RangeError('Target row height must be positive.');
  if (ratios.some((ratio) => !Number.isFinite(ratio) || ratio <= 0))
    throw new RangeError('Photo aspect ratios must be positive.');
  if (!ratios.length) return { rows: [], heightRangeSatisfied: true };

  const minHeight = target * MIN_ROW_HEIGHT_RATIO;
  const maxHeight = target * MAX_ROW_HEIGHT_RATIO;

  function solve(enforceHeightRange: boolean): JustifiedRow[] | undefined {
    const costs: Array<{ outOfRangePhotos: number; deviation: number } | undefined> = Array(
      ratios.length + 1,
    );
    const previous = Array(ratios.length + 1).fill(-1);
    costs[0] = { outOfRangePhotos: 0, deviation: 0 };

    for (let end = 1; end <= ratios.length; end++) {
      for (let start = 0; start < end; start++) {
        const previousCost = costs[start];
        if (!previousCost) continue;
        const availableWidth = width - gap * (end - start - 1);
        if (availableWidth <= 0) continue;
        const height = rowHeight(ratios, start, end, width, gap);
        const outOfRange = height < minHeight || height > maxHeight;
        if (enforceHeightRange && outOfRange) continue;
        const cost = {
          outOfRangePhotos: previousCost.outOfRangePhotos + (outOfRange ? end - start : 0),
          deviation: previousCost.deviation + (height - target) ** 2,
        };
        const currentCost = costs[end];
        if (
          !currentCost ||
          cost.outOfRangePhotos < currentCost.outOfRangePhotos ||
          (cost.outOfRangePhotos === currentCost.outOfRangePhotos &&
            cost.deviation < currentCost.deviation)
        ) {
          costs[end] = cost;
          previous[end] = start;
        }
      }
    }

    if (previous[ratios.length] < 0) return undefined;

    const ranges: Array<[number, number]> = [];
    for (let end = ratios.length; end > 0;) {
      const start = previous[end];
      ranges.push([start, end]);
      end = start;
    }
    ranges.reverse();

    return ranges.map(([start, end]) => {
      const height = rowHeight(ratios, start, end, width, gap);
      const widths = ratios.slice(start, end).map((ratio) => ratio * height);
      const last = widths.length - 1;
      widths[last] =
        width -
        gap * (widths.length - 1) -
        widths.slice(0, last).reduce((sum, itemWidth) => sum + itemWidth, 0);
      return { start, end, height, widths };
    });
  }

  const boundedRows = solve(true);
  return {
    rows: boundedRows ?? solve(false)!,
    heightRangeSatisfied: Boolean(boundedRows),
  };
}
