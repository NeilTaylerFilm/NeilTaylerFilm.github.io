import { partitionRows, targetProjectRowHeightForWidth } from './justified-grid';

const DEFAULT_GAP = 6;

export function setupJustifiedGallery(gallery: HTMLElement) {
  const photos = Array.from(gallery.querySelectorAll<HTMLElement>(':scope > .gallery-item'));
  if (!photos.length) return;

  const ratios = photos.map((photo) => Number.parseFloat(photo.style.getPropertyValue('--ratio')));
  let lastWidth = Number.NaN;
  let pendingWidth = 0;
  let frame: number | undefined;
  let rowEnds: number[] = [];

  function layout(width: number) {
    const styles = getComputedStyle(gallery);
    const gapValue = Number.parseFloat(styles.getPropertyValue('--gallery-gap'));
    const gap = Number.isFinite(gapValue) ? gapValue : DEFAULT_GAP;
    const target = targetProjectRowHeightForWidth(width);
    const plan = partitionRows(ratios, width, gap, target, {
      allowIncompleteFinalRow: true,
      maxFinalRowHeightRatio: 1.25,
    });
    const nextEnds = plan.rows.map((row) => row.end);
    const boundariesMatch =
      nextEnds.length === rowEnds.length && nextEnds.every((end, index) => end === rowEnds[index]);

    if (!boundariesMatch) {
      const focused = gallery.contains(document.activeElement)
        ? (document.activeElement as HTMLElement)
        : undefined;
      const nextRows = plan.rows.map((row) => {
        const container = document.createElement('div');
        container.className = 'gallery-row';
        container.dataset.galleryRow = '';
        for (let index = row.start; index < row.end; index++) container.append(photos[index]);
        return container;
      });
      gallery.replaceChildren(...nextRows);
      rowEnds = nextEnds;

      if (focused?.isConnected && document.activeElement !== focused)
        focused.focus({ preventScroll: true });
    }

    const rows = Array.from(gallery.children) as HTMLElement[];
    plan.rows.forEach((row, rowIndex) => {
      const container = rows[rowIndex];
      container.dataset.justified = String(row.justified !== false);
      container.style.setProperty('--row-height', `${row.height}px`);

      for (let index = row.start; index < row.end; index++) {
        const photo = photos[index];
        if (row.justified === false)
          photo.style.setProperty('--photo-width', `${row.widths[index - row.start]}px`);
        else photo.style.removeProperty('--photo-width');
      }
    });
    gallery.dataset.enhanced = '';
  }

  function queueLayout(width: number) {
    if (!Number.isFinite(width) || width <= 0) return;
    const widthChange = 1 / Math.max(1, window.devicePixelRatio || 1);
    if (Number.isFinite(lastWidth) && Math.abs(width - lastWidth) < widthChange) return;
    lastWidth = width;
    pendingWidth = width;
    if (frame !== undefined) return;

    frame = requestAnimationFrame(() => {
      frame = undefined;
      layout(pendingWidth);
    });
  }

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === gallery) queueLayout(entry.contentRect.width);
    }
  });
  observer.observe(gallery);

  const bounds = gallery.getBoundingClientRect();
  const styles = getComputedStyle(gallery);
  const horizontalSpace =
    Number.parseFloat(styles.borderLeftWidth) +
    Number.parseFloat(styles.borderRightWidth) +
    Number.parseFloat(styles.paddingLeft) +
    Number.parseFloat(styles.paddingRight);
  queueLayout(bounds.width - horizontalSpace);
}
