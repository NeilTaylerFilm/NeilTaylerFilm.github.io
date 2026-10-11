// Orphan rule for the justified photo grid. The browser lays rows out greedily with flex-wrap;
// this only decides what to do with the final two rows, so rows above never move.

export const MIN_LAST_ROW_FILL = 0.6;
export const MIN_LAST_ROW_PHOTOS = 3;
// How far a rebuilt row may drift from the target row height (0.15 = 15%).
export const MAX_DEVIATION = 0.15;

// A row of photos with these aspect ratios (width / height) fills `width` at this height.
export function rowHeight(ratios: number[], width: number, gap: number) {
  return (width - gap * (ratios.length - 1)) / ratios.reduce((sum, ratio) => sum + ratio, 0);
}

// How much of the container a row would fill if its photos sat at the target height.
export function rowFill(ratios: number[], target: number, width: number, gap: number) {
  return (ratios.reduce((sum, ratio) => sum + ratio * target, 0) + gap * (ratios.length - 1)) / width;
}

export function isOrphan(last: number[], target: number, width: number, gap: number) {
  return (
    last.length < MIN_LAST_ROW_PHOTOS || rowFill(last, target, width, gap) < MIN_LAST_ROW_FILL
  );
}

// Splits the merged photos of the last two rows into two full-width rows. The best split is the
// one whose taller row is closest to the target height (a linear partition into 2 rows).
export function balanceTwoRows(ratios: number[], target: number, width: number, gap: number) {
  let best = { split: 1, heights: [0, 0], deviation: Infinity };
  for (let split = 1; split < ratios.length; split++) {
    const heights = [
      rowHeight(ratios.slice(0, split), width, gap),
      rowHeight(ratios.slice(split), width, gap),
    ];
    const deviation = Math.max(...heights.map((height) => Math.abs(height - target) / target));
    if (deviation < best.deviation) best = { split, heights, deviation };
  }
  return best;
}

export type LastRowsPlan =
  | { kind: 'none' }
  | { kind: 'merge'; split: number; heights: number[] }
  | { kind: 'unstretch'; height: number };

// What to do with the final two rows once every photo is revealed. A short last row is merged
// into the row above only if both new rows stay within MAX_DEVIATION of the target height;
// otherwise it is left at the target height, left-aligned, not stretched.
export function planLastRows(
  previous: number[],
  last: number[],
  target: number,
  base: number,
  width: number,
  gap: number,
): LastRowsPlan {
  const stretched = rowHeight(last, width, gap);
  const short = isOrphan(last, base, width, gap) || stretched > target * (1 + MAX_DEVIATION);
  if (!short) return { kind: 'none' };
  const best = balanceTwoRows([...previous, ...last], target, width, gap);
  if (best.deviation <= MAX_DEVIATION) return { kind: 'merge', ...best };
  return { kind: 'unstretch', height: Math.min(target, stretched) };
}
