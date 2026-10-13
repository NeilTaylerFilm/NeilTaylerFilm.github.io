export const MIN_ROW_HEIGHT_RATIO = 0.6;
export const MAX_ROW_HEIGHT_RATIO = 1.6;

export type JustifiedRow = {
  start: number;
  end: number;
  height: number;
  widths: number[];
  justified?: boolean;
};

export type JustifiedGridPlan = {
  rows: JustifiedRow[];
  heightRangeSatisfied: boolean;
};

export type PartitionRowsOptions = {
  allowIncompleteFinalRow?: boolean;
  maxFinalRowHeightRatio?: number;
};

export function targetRowHeightForWidth(width: number) {
  return width < 900 ? 260 : 320;
}

export function targetProjectRowHeightForWidth(width: number) {
  if (!Number.isFinite(width) || width <= 0) throw new RangeError('Grid width must be positive.');
  if (width < 540) return 190;
  if (width < 900) return 250;
  return 290;
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
  options: PartitionRowsOptions = {},
): JustifiedGridPlan {
  if (!Number.isFinite(width) || width <= 0) throw new RangeError('Grid width must be positive.');
  if (!Number.isFinite(gap) || gap < 0) throw new RangeError('Grid gap must be nonnegative.');
  if (!Number.isFinite(target) || target <= 0)
    throw new RangeError('Target row height must be positive.');
  if (ratios.some((ratio) => !Number.isFinite(ratio) || ratio <= 0))
    throw new RangeError('Photo aspect ratios must be positive.');
  if (!options || typeof options !== 'object')
    throw new TypeError('Partition options must be an object.');
  if (
    typeof options.allowIncompleteFinalRow !== 'undefined' &&
    typeof options.allowIncompleteFinalRow !== 'boolean'
  )
    throw new TypeError('allowIncompleteFinalRow must be a boolean.');
  const maxFinalRowHeightRatio = options.maxFinalRowHeightRatio ?? 1.25;
  if (!Number.isFinite(maxFinalRowHeightRatio) || maxFinalRowHeightRatio <= 0)
    throw new RangeError('Maximum final row height ratio must be positive.');
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

  function solveWithIncompleteFinalRow(): JustifiedGridPlan {
    type Cost = { outOfRangePhotos: number; total: number };
    const costs: Array<Cost | undefined> = Array(ratios.length + 1);
    const previous = Array(ratios.length + 1).fill(-1);
    costs[0] = { outOfRangePhotos: 0, total: 0 };

    function geometry(start: number, end: number) {
      const availableWidth = width - gap * (end - start - 1);
      if (!Number.isFinite(availableWidth) || availableWidth <= 0) return undefined;

      const segment = ratios.slice(start, end);
      const maxRatio = segment.reduce((max, ratio) => Math.max(max, ratio), 0);
      const normalizedSum = segment.reduce((sum, ratio) => sum + ratio / maxRatio, 0);
      const height = availableWidth / maxRatio / normalizedSum;
      if (!Number.isFinite(height) || height <= 0) return undefined;

      const widths = segment.map((ratio) => (ratio / maxRatio / normalizedSum) * availableWidth);
      const last = widths.length - 1;
      widths[last] =
        availableWidth - widths.slice(0, last).reduce((sum, itemWidth) => sum + itemWidth, 0);
      if (widths.some((itemWidth) => !Number.isFinite(itemWidth) || itemWidth <= 0))
        return undefined;

      return { height, widths, availableWidth };
    }

    function compare(cost: Cost, current: Cost | undefined) {
      return (
        !current ||
        cost.outOfRangePhotos < current.outOfRangePhotos ||
        (cost.outOfRangePhotos === current.outOfRangePhotos && cost.total < current.total)
      );
    }

    for (let end = 1; end < ratios.length; end++) {
      for (let start = 0; start < end; start++) {
        const previousCost = costs[start];
        const row = geometry(start, end);
        if (!previousCost || !row) continue;
        const outOfRange = row.height < minHeight || row.height > maxHeight;
        const deviation = (row.height - target) ** 2;
        const cost = {
          outOfRangePhotos: previousCost.outOfRangePhotos + (outOfRange ? end - start : 0),
          total: previousCost.total + deviation,
        };
        if (!Number.isFinite(cost.total)) continue;
        if (compare(cost, costs[end])) {
          costs[end] = cost;
          previous[end] = start;
        }
      }
    }

    let best: (Cost & { start: number; row: JustifiedRow }) | undefined;
    const maxFinalHeight = Math.min(maxHeight, target * maxFinalRowHeightRatio);

    for (let start = 0; start < ratios.length; start++) {
      const previousCost = costs[start];
      const fullRow = geometry(start, ratios.length);
      if (!previousCost || !fullRow) continue;

      const count = ratios.length - start;
      const canJustify = fullRow.height >= minHeight && fullRow.height <= maxFinalHeight;
      let row: JustifiedRow;
      let outOfRangePhotos = 0;
      let rowCost: number;

      if (canJustify) {
        row = { start, end: ratios.length, height: fullRow.height, widths: fullRow.widths };
        rowCost = (fullRow.height - target) ** 2;
      } else {
        const naturalWidths = ratios.slice(start).map((ratio) => ratio * target);
        const usedWidth =
          naturalWidths.reduce((sum, itemWidth) => sum + itemWidth, 0) + gap * (count - 1);
        const canFitAtTarget =
          naturalWidths.every((itemWidth) => Number.isFinite(itemWidth) && itemWidth > 0) &&
          Number.isFinite(usedWidth) &&
          usedWidth <= width;

        if (fullRow.height > maxFinalHeight && canFitAtTarget) {
          const unusedWidth = width - usedWidth;
          row = {
            start,
            end: ratios.length,
            height: target,
            widths: naturalWidths,
            justified: false,
          };
          rowCost = 0.25 * ((unusedWidth / width) * target) ** 2;
        } else {
          row = { start, end: ratios.length, height: fullRow.height, widths: fullRow.widths };
          const outOfRange = fullRow.height < minHeight || fullRow.height > maxHeight;
          outOfRangePhotos = outOfRange ? count : 0;
          rowCost = (fullRow.height - target) ** 2;
        }
      }

      const cost = {
        start,
        row,
        outOfRangePhotos: previousCost.outOfRangePhotos + outOfRangePhotos,
        total: previousCost.total + rowCost,
      };
      if (!Number.isFinite(cost.total)) continue;
      if (compare(cost, best)) best = cost;
    }

    if (!best) throw new RangeError('Photo aspect ratios cannot produce finite row geometry.');

    const ranges: Array<[number, number]> = [];
    for (let end = best.start; end > 0;) {
      const start = previous[end];
      if (start < 0)
        throw new RangeError('Photo aspect ratios cannot produce finite row geometry.');
      ranges.push([start, end]);
      end = start;
    }
    ranges.reverse();

    const rows = ranges.map(([start, end]) => {
      const row = geometry(start, end);
      if (!row) throw new RangeError('Photo aspect ratios cannot produce finite row geometry.');
      return { start, end, height: row.height, widths: row.widths };
    });
    rows.push(best.row);
    return { rows, heightRangeSatisfied: best.outOfRangePhotos === 0 };
  }

  if (options.allowIncompleteFinalRow) return solveWithIncompleteFinalRow();
  const boundedRows = solve(true);
  return {
    rows: boundedRows ?? solve(false)!,
    heightRangeSatisfied: Boolean(boundedRows),
  };
}
