import { partitionRows, targetRowHeightForWidth } from './justified-grid.ts';
import { createPhotoViewer } from './photo-viewer.ts';

export function setupPortfolio(root: HTMLElement) {
  const photos = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-portfolio-photo]'));
  const grid = root.querySelector<HTMLElement>('[data-portfolio-grid]')!;
  const more = root.querySelector<HTMLButtonElement>('[data-portfolio-more]')!;
  const status = root.querySelector<HTMLElement>('[data-portfolio-status]')!;
  const limit = Math.min(photos.length, 72);
  let visibleCount = Math.min(limit, 24);
  let rowEnds: number[] = [];
  const setShown = (photo: HTMLElement, on: boolean) => {
    photo.hidden = !on;
    photo.toggleAttribute('data-revealed', on);
  };
  const completeRowCount = (count: number) =>
    count >= limit ? limit : (rowEnds.find((end) => end >= count) ?? limit);
  const layoutRows = () => {
    const width = grid.getBoundingClientRect().width;
    if (width <= 0 || !limit) return;
    const styles = getComputedStyle(root);
    const gapValue = Number.parseFloat(styles.getPropertyValue('--photo-gap'));
    const targetValue = Number.parseFloat(styles.getPropertyValue('--target-row-height'));
    const gap = Number.isFinite(gapValue) ? gapValue : 6;
    const target = Number.isFinite(targetValue) ? targetValue : targetRowHeightForWidth(width);
    const ratios = photos.slice(0, limit).map((photo) => {
      const image = photo.querySelector<HTMLImageElement>('img')!;
      return Number(image.getAttribute('width')) / Number(image.getAttribute('height'));
    });
    const plan = partitionRows(ratios, width, gap, target);
    rowEnds = plan.rows.map((row) => row.end);
    plan.rows.forEach(({ start, end, height, widths }) => {
      for (let index = start; index < end; index++) {
        photos[index].style.setProperty('--row-height', `${height}px`);
        photos[index].style.setProperty('--row-width', `${widths[index - start]}px`);
      }
    });
    if (visibleCount < limit) visibleCount = completeRowCount(visibleCount);
  };
  const updateVisiblePhotos = () => {
    photos.forEach((photo, index) => setShown(photo, index < visibleCount));
    more.hidden = visibleCount >= limit;
  };
  layoutRows();
  updateVisiblePhotos();
  const prioritizeFirstRow = () => {
    const firstTop = photos.find((photo) => !photo.hidden)?.offsetTop;
    photos.forEach((photo) => {
      const image = photo.querySelector('img')!;
      image.loading = !photo.hidden && photo.offsetTop === firstTop ? 'eager' : 'lazy';
    });
  };
  prioritizeFirstRow();
  const updateLayout = () => {
    layoutRows();
    updateVisiblePhotos();
    prioritizeFirstRow();
  };
  window.addEventListener('resize', updateLayout, { passive: true });
  window.addEventListener('orientationchange', updateLayout, { passive: true });
  more.addEventListener('click', () => {
    const firstNew = visibleCount;
    visibleCount = completeRowCount(Math.min(visibleCount + 12, limit));
    updateVisiblePhotos();
    status.textContent = `${photos.filter((photo) => !photo.hidden).length} of ${limit} photographs shown.`;
    photos
      .slice(Math.max(firstNew, 0))
      .find((photo) => !photo.hidden)
      ?.focus({ preventScroll: true });
  });

  const dialog = root.querySelector<HTMLDialogElement>('[data-portfolio-dialog]');

  if (!dialog) return;

  const viewer = createPhotoViewer(dialog, () => photos.slice(0, visibleCount));

  photos.forEach((photo) => viewer?.bind(photo));
}
