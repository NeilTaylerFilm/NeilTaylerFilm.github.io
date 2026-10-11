import { partitionRows, targetRowHeightForWidth } from './justified-grid.ts';

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

  const dialog = root.querySelector<HTMLDialogElement>('[data-portfolio-dialog]')!;
  if (typeof dialog.showModal !== 'function') return;
  const find = <T extends HTMLElement>(name: string) =>
    dialog.querySelector<T>(`[data-portfolio-${name}]`)!;
  const close = find<HTMLButtonElement>('close');
  const previous = find<HTMLButtonElement>('prev');
  const next = find<HTMLButtonElement>('next');
  const retry = find<HTMLButtonElement>('retry');
  const stage = find<HTMLElement>('stage');
  const imageStage = find<HTMLElement>('image-stage');
  const track = find<HTMLElement>('track');
  const count = find<HTMLElement>('count');
  const pagination = dialog.querySelector<HTMLElement>('[data-portfolio-pagination]');
  const dotHost = find<HTMLElement>('dots');
  const project = find<HTMLAnchorElement>('project');
  const feedback = find<HTMLElement>('feedback');
  let current = 0;
  let trackCount = 0;
  let dotWindowStart = 0;
  let renderedVisibleCount = 0;
  let opener: HTMLAnchorElement | undefined;
  let savedScroll = 0;
  let bodyStyle = '';
  let pointer:
    | {
        id: number;
        x: number;
        y: number;
        lastX: number;
        lastTime: number;
        velocity: number;
        horizontal: boolean;
      }
    | undefined;
  let scrubPointer:
    | {
        id: number;
        x: number;
        y: number;
        index: number;
        timer: ReturnType<typeof setTimeout>;
        active: boolean;
      }
    | undefined;
  let fadeTimer: ReturnType<typeof setTimeout> | undefined;
  let fadeSequence = 0;
  let loadSequence = 0;
  let slidesByPhoto = new Map<number, HTMLElement>();
  const loadedImages = new Map<number, HTMLImageElement>();
  const loadingImages = new Map<number, number>();
  const failedImages = new Set<number>();
  let swiped = false;
  let dots: HTMLButtonElement[] = [];

  function makeImage(index: number) {
    const photo = photos[index];
    const thumbnail = photo.querySelector('img')!;
    const candidate = new Image();
    candidate.alt = '';
    candidate.width = thumbnail.width;
    candidate.height = thumbnail.height;
    candidate.decoding = 'async';
    candidate.sizes = '(max-width: 540px) calc(100vw - 16px), calc(100vw - 160px)';
    candidate.srcset = photo.dataset.srcset || '';
    candidate.src = photo.dataset.full!;
    candidate.draggable = false;
    return candidate;
  }

  function reducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  function trackWidth() {
    return imageStage.getBoundingClientRect().width || window.innerWidth || 1;
  }

  function setTrackPosition(slot: number) {
    track.style.transform = 'translate3d(' + -slot * trackWidth() + 'px, 0, 0)';
  }

  function ensureTrack() {
    if (trackCount === visibleCount) return;
    slidesByPhoto = new Map();
    track.replaceChildren(
      ...Array.from({ length: visibleCount }, (_, index) => {
        const slide = document.createElement('div');
        slide.className = 'portfolio-slide';
        slide.dataset.photoIndex = String(index);
        slide.setAttribute('aria-hidden', 'true');
        slidesByPhoto.set(index, slide);
        return slide;
      }),
    );
    trackCount = visibleCount;
  }

  function renderImage(index: number, source: HTMLImageElement) {
    const slide = slidesByPhoto.get(index);
    if (slide) {
      const image = source.cloneNode(true) as HTMLImageElement;
      image.alt = '';
      image.draggable = false;
      slide.replaceChildren(image);
    }
  }

  function renderPreview(index: number) {
    const thumbnail = photos[index].querySelector('img')!;
    const preview = thumbnail.cloneNode(true) as HTMLImageElement;
    preview.removeAttribute('srcset');
    preview.removeAttribute('loading');
    preview.alt = '';
    preview.draggable = false;
    preview.src = thumbnail.currentSrc || thumbnail.src;
    renderImage(index, preview);
  }

  function isNear(index: number) {
    return index === current || index === current - 1 || index === current + 1;
  }

  function loadImage(index: number) {
    if (loadedImages.has(index) || loadingImages.has(index) || failedImages.has(index)) return;
    const candidate = makeImage(index);
    const sequence = ++loadSequence;
    loadingImages.set(index, sequence);
    void candidate.decode().then(
      () => {
        if (loadingImages.get(index) !== sequence) return;
        loadingImages.delete(index);
        if (!dialog.open) return;
        loadedImages.set(index, candidate);
        if (isNear(index)) renderImage(index, candidate);
        if (index === current) {
          feedback.textContent = '';
          retry.hidden = true;
        }
      },
      () => {
        if (loadingImages.get(index) !== sequence) return;
        loadingImages.delete(index);
        failedImages.add(index);
        if (dialog.open && index === current) {
          feedback.textContent = 'This photograph could not load. Please try again.';
          retry.hidden = false;
        }
      },
    );
  }

  function updatePagination() {
    if (!pagination) return;
    pagination.hidden = visibleCount === 0;
    if (pagination.hidden) return;
    if (visibleCount <= 5) dotWindowStart = 0;
    else {
      if (current < dotWindowStart + 1 && dotWindowStart > 0) dotWindowStart = current - 1;
      if (current > dotWindowStart + 3 && dotWindowStart < visibleCount - 5)
        dotWindowStart = current - 3;
      dotWindowStart = Math.max(0, Math.min(visibleCount - 5, dotWindowStart));
    }
    const windowCount = Math.min(5, visibleCount);
    const stripWidth = windowCount * 24;
    const step = windowCount > 1 ? 24 : 0;
    const label = `Photo ${current + 1} of ${visibleCount}`;
    pagination.style.width = `${stripWidth}px`;
    pagination.setAttribute('aria-label', label);
    count.textContent = label;
    if (renderedVisibleCount !== visibleCount) {
      dots = Array.from({ length: visibleCount }, () => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'portfolio-dot';
        dot.addEventListener('click', () => show(Number(dot.dataset.index)));
        return dot;
      });
      dotHost.replaceChildren(...dots);
      renderedVisibleCount = visibleCount;
    }
    dots.forEach((dot, index) => {
      const offset = index - dotWindowStart;
      const inWindow = offset >= 0 && offset < windowCount;
      const leftTaper = visibleCount > 5 && dotWindowStart > 0;
      const rightTaper = visibleCount > 5 && dotWindowStart + windowCount < visibleCount;
      let scale = 1;
      let opacity = visibleCount > 5 ? 0.55 : 0.7;
      if (inWindow && leftTaper && offset === 0) {
        scale = 0.5;
        opacity = 0.25;
      } else if (inWindow && leftTaper && offset === 1) {
        scale = 0.75;
        opacity = 0.4;
      }
      if (inWindow && rightTaper && offset === windowCount - 1) {
        scale = 0.5;
        opacity = 0.25;
      } else if (inWindow && rightTaper && offset === windowCount - 2) {
        scale = 0.75;
        opacity = 0.4;
      }
      if (index === current) {
        scale = 1.3;
        opacity = 1;
        dot.setAttribute('aria-current', 'true');
      } else dot.removeAttribute('aria-current');
      dot.dataset.index = String(index);
      dot.setAttribute('aria-label', `Photo ${index + 1} of ${visibleCount}`);
      dot.tabIndex = inWindow ? 0 : -1;
      if (inWindow) dot.removeAttribute('aria-hidden');
      else dot.setAttribute('aria-hidden', 'true');
      dot.style.transform = `translate3d(calc(-50% + ${offset * step - ((windowCount - 1) * step) / 2}px), -50%, 0)`;
      dot.style.setProperty('--dot-scale', String(inWindow ? scale : 0));
      dot.style.setProperty('--dot-opacity', inWindow ? String(opacity) : '0');
    });
  }

  function show(index: number, duration = 280, mode: 'slide' | 'fade' = 'slide') {
    const target = Math.max(0, Math.min(visibleCount - 1, index));
    const changed = target !== current;
    if (fadeTimer) clearTimeout(fadeTimer);
    const hasMotion = duration > 0 && !reducedMotion();
    const useFade = mode === 'fade' && changed && hasMotion;
    const wasFading = track.style.opacity === '0';
    current = target;
    updatePagination();
    ensureTrack();
    if (useFade) {
      const sequence = ++fadeSequence;
      track.style.transitionProperty = 'opacity';
      track.style.transitionDuration = '60ms';
      track.style.opacity = '0';
      fadeTimer = setTimeout(
        () => {
          if (sequence !== fadeSequence) return;
          track.style.transitionDuration = '0ms';
          setTrackPosition(current);
          track.getBoundingClientRect();
          track.style.transitionDuration = '60ms';
          track.style.opacity = '1';
          fadeTimer = setTimeout(() => {
            if (sequence !== fadeSequence) return;
            track.style.transitionProperty = 'transform';
            track.style.transitionDuration = '280ms';
            fadeTimer = undefined;
          }, 60);
        },
        wasFading ? 0 : 60,
      );
    } else {
      fadeSequence++;
      track.style.opacity = '1';
      track.style.transitionProperty = 'transform';
      track.style.transitionDuration = hasMotion ? duration + 'ms' : '0ms';
      setTrackPosition(current);
    }
    const photo = photos[current];
    if (photo.dataset.projectUrl) project.href = photo.dataset.projectUrl;
    else project.removeAttribute('href');
    project.hidden = !photo.dataset.projectUrl;
    previous.hidden = current === 0;
    next.hidden = current === visibleCount - 1;
    const nearby = new Set([
      current,
      ...(current > 0 ? [current - 1] : []),
      ...(current < visibleCount - 1 ? [current + 1] : []),
    ]);
    slidesByPhoto.forEach((slide, photoIndex) => {
      if (!nearby.has(photoIndex)) slide.replaceChildren();
    });
    loadedImages.forEach((_, photoIndex) => {
      if (!nearby.has(photoIndex)) loadedImages.delete(photoIndex);
    });
    nearby.forEach((photoIndex) => {
      const image = loadedImages.get(photoIndex);
      if (image) renderImage(photoIndex, image);
      else renderPreview(photoIndex);
      loadImage(photoIndex);
    });
    if (failedImages.has(current)) {
      feedback.textContent = 'This photograph could not load. Please try again.';
      retry.hidden = false;
    } else {
      feedback.textContent = loadedImages.has(current) ? '' : 'Loading photograph…';
      retry.hidden = true;
    }
  }

  photos.forEach((photo, index) => {
    photo.setAttribute('aria-haspopup', 'dialog');
    photo.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
        return;
      event.preventDefault();
      close.toggleAttribute('data-pointer-open', event.detail > 0);
      opener = photo;
      savedScroll = window.scrollY;
      bodyStyle = document.body.style.cssText;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedScroll}px`;
      document.body.style.width = '100%';
      document.documentElement.classList.add('modal-open');
      dialog.showModal();
      show(index, 0);
      close.focus({ preventScroll: true });
    });
  });
  close.addEventListener('blur', () => close.removeAttribute('data-pointer-open'));
  close.addEventListener('click', () => dialog.close());
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  retry.addEventListener('click', () => {
    failedImages.delete(current);
    loadedImages.delete(current);
    loadingImages.delete(current);
    renderPreview(current);
    feedback.textContent = 'Loading photograph…';
    retry.hidden = true;
    loadImage(current);
  });
  dialog.addEventListener('keydown', (event) => {
    close.removeAttribute('data-pointer-open');
    if (event.key === 'Tab') {
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]'),
      ).filter((control) => control.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  dialog.addEventListener('pointerdown', (event) => {
    swiped = false;
    if (event.isPrimary === false) pointer = undefined;
  });
  dialog.addEventListener('click', (event) => {
    if (swiped) {
      swiped = false;
      return;
    }
    if (event.target === stage) {
      dialog.close();
      return;
    }
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  });
  const updateViewport = () => {
    const height = window.visualViewport?.height;
    if (height) dialog.style.setProperty('--lightbox-h', `${height}px`);
    else dialog.style.removeProperty('--lightbox-h');
    if (!dialog.open) return;
    track.style.transitionProperty = 'transform';
    track.style.transitionDuration = '0ms';
    setTrackPosition(current);
    updatePagination();
  };
  window.addEventListener('resize', updateViewport, { passive: true });
  window.visualViewport?.addEventListener('resize', updateViewport, { passive: true });
  updateViewport();
  if (pagination) {
    pagination.addEventListener('pointerdown', (event) => {
      if (event.isPrimary === false || event.button !== 0) return;
      if ((event.target as HTMLElement).closest('.portfolio-dot')) return;
      const timer = setTimeout(() => {
        if (!scrubPointer || scrubPointer.id !== event.pointerId) return;
        scrubPointer.active = true;
        pagination.classList.add('is-scrubbing');
        pagination.setPointerCapture(event.pointerId);
      }, 250);
      scrubPointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        index: current,
        timer,
        active: false,
      };
      pagination.setPointerCapture(event.pointerId);
    });
    pagination.addEventListener('pointermove', (event) => {
      if (!scrubPointer || scrubPointer.id !== event.pointerId) return;
      if (!scrubPointer.active) {
        if (Math.hypot(event.clientX - scrubPointer.x, event.clientY - scrubPointer.y) > 8)
          clearTimeout(scrubPointer.timer);
        return;
      }
      const steps = Math.trunc((event.clientX - scrubPointer.x) / 14);
      const index = Math.max(0, Math.min(visibleCount - 1, scrubPointer.index + steps));
      if (index !== current) {
        show(index, 120, 'fade');
      }
    });
    pagination.addEventListener('pointerup', (event) => {
      if (!scrubPointer || scrubPointer.id !== event.pointerId) return;
      clearTimeout(scrubPointer.timer);
      pagination.classList.remove('is-scrubbing');
      scrubPointer = undefined;
    });
    pagination.addEventListener('pointercancel', (event) => {
      if (!scrubPointer || scrubPointer.id !== event.pointerId) return;
      clearTimeout(scrubPointer.timer);
      pagination.classList.remove('is-scrubbing');
      scrubPointer = undefined;
    });
  }
  imageStage.addEventListener('pointerdown', (event) => {
    if (event.isPrimary === false || event.pointerType === 'mouse' || event.button !== 0) {
      pointer = undefined;
      return;
    }
    swiped = false;
    pointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      horizontal: false,
    };
  });
  imageStage.addEventListener('pointermove', (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const elapsed = Math.max(event.timeStamp - pointer.lastTime, 1);
    pointer.velocity = (event.clientX - pointer.lastX) / elapsed;
    pointer.lastX = event.clientX;
    pointer.lastTime = event.timeStamp;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.horizontal && Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) {
      pointer = undefined;
      return;
    }
    if (!pointer.horizontal && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      pointer.horizontal = true;
      imageStage.setPointerCapture(event.pointerId);
    }
    if (pointer.horizontal) {
      track.style.transitionProperty = 'transform';
      track.style.transitionDuration = '0ms';
      const atStart = current === 0 && dx > 0;
      const atEnd = current === visibleCount - 1 && dx < 0;
      const resisted = atStart || atEnd ? dx * 0.25 : dx;
      const offset = -current * trackWidth() + resisted;
      track.style.transform = 'translate3d(' + offset + 'px, 0, 0)';
    }
  });
  imageStage.addEventListener('pointerup', (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.horizontal && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      pointer.horizontal = true;
      imageStage.setPointerCapture(event.pointerId);
    }
    const elapsed = Math.max(event.timeStamp - pointer.lastTime, 1);
    const releaseDelta = event.clientX - pointer.lastX;
    const velocity = releaseDelta ? releaseDelta / elapsed : pointer.velocity;
    const direction = dx < 0 ? 1 : -1;
    const shouldAdvance =
      pointer.horizontal &&
      Math.abs(dx) > Math.abs(dy) * 1.15 &&
      (Math.abs(dx) >= trackWidth() * 0.25 || (Math.abs(dx) > 8 && Math.abs(velocity) > 0.55));
    pointer = undefined;
    if (shouldAdvance) swiped = true;
    if (shouldAdvance) {
      show(current + direction);
    } else {
      track.style.transitionProperty = 'transform';
      track.style.transitionDuration = reducedMotion() ? '0ms' : '280ms';
      setTrackPosition(current);
    }
  });
  imageStage.addEventListener('pointercancel', (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    pointer = undefined;
    track.style.transitionProperty = 'transform';
    track.style.transitionDuration = reducedMotion() ? '0ms' : '280ms';
    setTrackPosition(current);
  });
  dialog.addEventListener('close', () => {
    loadSequence++;
    trackCount = 0;
    fadeSequence++;
    if (fadeTimer) clearTimeout(fadeTimer);
    fadeTimer = undefined;
    slidesByPhoto.clear();
    loadedImages.clear();
    loadingImages.clear();
    failedImages.clear();
    track.replaceChildren();
    track.style.transform = '';
    track.style.opacity = '1';
    track.style.transitionProperty = 'transform';
    track.style.transitionDuration = '';
    dots = [];
    renderedVisibleCount = 0;
    dotHost.replaceChildren();
    pagination?.classList.remove('is-scrubbing');
    if (scrubPointer) clearTimeout(scrubPointer.timer);
    scrubPointer = undefined;
    pointer = undefined;
    feedback.textContent = '';
    retry.hidden = true;
    document.documentElement.classList.remove('modal-open');
    document.body.style.cssText = bodyStyle;
    window.scrollTo({ top: savedScroll, behavior: 'instant' });
    opener?.focus({ preventScroll: true });
  });
}
