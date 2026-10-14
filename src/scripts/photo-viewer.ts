export function createPhotoViewer(
  dialog: HTMLDialogElement,
  getPhotos: () => HTMLAnchorElement[],
  options: { hideSinglePagination?: boolean } = {},
) {
  if (typeof dialog.showModal !== 'function') return null;

  const maxZoom = 2;
  let items: HTMLAnchorElement[] = [];
  let visibleCount = 0;
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
  const openLink = dialog.querySelector<HTMLAnchorElement>('[data-portfolio-open]');
  const caption = dialog.querySelector<HTMLElement>('[data-portfolio-caption]');
  function syncCaptionFocus() {
    if (!caption) return;

    if (caption.scrollHeight > caption.clientHeight + 1) {
      caption.tabIndex = 0;
      caption.setAttribute('role', 'region');
      caption.setAttribute('aria-label', 'Photo caption');
      return;
    }

    if (document.activeElement === caption) {
      close.focus({ preventScroll: true });
    }

    caption.removeAttribute('tabindex');
    caption.removeAttribute('role');
    caption.removeAttribute('aria-label');
  }
  let current = 0;
  let trackCount = 0;
  let dotWindowStart = 0;
  let renderedVisibleCount = 0;
  let opener: HTMLAnchorElement | undefined;
  let savedScroll = 0;
  let bodyStyle = '';
  let zoomScale = 1;
  let zoomX = 0;
  let zoomY = 0;
  const touchPoints = new Map<number, { x: number; y: number }>();
  let pinch:
    | {
        distance: number;
        scale: number;
        x: number;
        y: number;
        centerX: number;
        centerY: number;
      }
    | undefined;
  let pan:
    | {
        id: number;
        x: number;
        y: number;
        zoomX: number;
        zoomY: number;
        suppressTap: boolean;
      }
    | undefined;
  let lastTap: { time: number; x: number; y: number } | undefined;
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
    const photo = items[index];
    const thumbnail = photo.querySelector('img')!;
    const candidate = new Image();
    candidate.alt = photo.dataset.alt ?? '';
    candidate.width = thumbnail.width;
    candidate.height = thumbnail.height;
    candidate.decoding = 'async';
    candidate.sizes = '(max-width: 540px) calc(100vw - 16px), calc(100vw - 160px)';
    candidate.srcset = photo.dataset.srcset || '';
    candidate.src = photo.dataset.full || photo.href;
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

  function activeImage() {
    return slidesByPhoto.get(current)?.querySelector<HTMLImageElement>('img');
  }

  function zoomedImageSizes() {
    return `${Math.ceil((imageStage.clientWidth || window.innerWidth) * maxZoom)}px`;
  }

  function applyZoom(animate = false) {
    const image = activeImage();
    if (!image) return;

    image.style.transition = animate && !reducedMotion() ? '' : 'none';
    if (zoomScale <= 1) {
      zoomScale = 1;
      zoomX = 0;
      zoomY = 0;
      image.style.removeProperty('transform');
      image.removeAttribute('data-zoomed');
      return;
    }

    const bounds = imageStage.getBoundingClientRect();
    const naturalWidth = image.naturalWidth || image.clientWidth || bounds.width;
    const naturalHeight = image.naturalHeight || image.clientHeight || bounds.height;
    const fit = Math.min(image.clientWidth / naturalWidth, image.clientHeight / naturalHeight);
    const maxX = Math.max(0, (naturalWidth * fit * zoomScale - bounds.width) / 2);
    const maxY = Math.max(0, (naturalHeight * fit * zoomScale - bounds.height) / 2);
    zoomX = Math.max(-maxX, Math.min(maxX, zoomX));
    zoomY = Math.max(-maxY, Math.min(maxY, zoomY));

    image.sizes = zoomedImageSizes();
    image.dataset.zoomed = '';
    image.style.transformOrigin = 'center';
    image.style.transform = `translate3d(${zoomX}px, ${zoomY}px, 0) scale(${zoomScale})`;
  }

  function resetZoom() {
    zoomScale = 1;
    zoomX = 0;
    zoomY = 0;
    pinch = undefined;
    pan = undefined;
    lastTap = undefined;
    applyZoom();
  }

  function setZoom(scale: number, x: number, y: number, animate = true) {
    const target = Math.max(1, Math.min(maxZoom, scale));
    if (target === 1) {
      zoomScale = 1;
      zoomX = 0;
      zoomY = 0;
    } else {
      const bounds = imageStage.getBoundingClientRect();
      zoomScale = target;
      zoomX = (1 - target) * (x - bounds.left - bounds.width / 2);
      zoomY = (1 - target) * (y - bounds.top - bounds.height / 2);
    }
    applyZoom(animate);
  }

  function toggleZoom(x: number, y: number) {
    lastTap = undefined;
    setZoom(zoomScale > 1 ? 1 : maxZoom, x, y);
  }

  function beginPinch() {
    const [first, second] = Array.from(touchPoints.values()).slice(0, 2);
    if (!first || !second) return;
    const centerX = (first.x + second.x) / 2;
    const centerY = (first.y + second.y) / 2;
    pinch = {
      distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
      scale: zoomScale,
      x: zoomX,
      y: zoomY,
      centerX,
      centerY,
    };
    pan = undefined;
    pointer = undefined;
    lastTap = undefined;
    swiped = true;
    track.style.transitionProperty = 'transform';
    track.style.transitionDuration = '0ms';
    setTrackPosition(current);
    for (const id of touchPoints.keys()) imageStage.setPointerCapture(id);
  }

  function updatePinch() {
    if (!pinch) return;
    const [first, second] = Array.from(touchPoints.values()).slice(0, 2);
    if (!first || !second) return;
    const centerX = (first.x + second.x) / 2;
    const centerY = (first.y + second.y) / 2;
    const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
    const scale = Math.max(1, Math.min(maxZoom, pinch.scale * (distance / pinch.distance)));
    const ratio = scale / pinch.scale;
    const bounds = imageStage.getBoundingClientRect();

    zoomScale = scale;
    zoomX =
      centerX -
      bounds.left -
      bounds.width / 2 -
      ratio * (pinch.centerX - bounds.left - bounds.width / 2 - pinch.x);
    zoomY =
      centerY -
      bounds.top -
      bounds.height / 2 -
      ratio * (pinch.centerY - bounds.top - bounds.height / 2 - pinch.y);
    applyZoom();
  }

  function recordTap(event: PointerEvent) {
    if (
      lastTap &&
      event.timeStamp - lastTap.time <= 320 &&
      Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <= 32
    ) {
      lastTap = undefined;
      swiped = true;
      toggleZoom(event.clientX, event.clientY);
    } else {
      lastTap = { time: event.timeStamp, x: event.clientX, y: event.clientY };
    }
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
      image.alt = items[index].dataset.alt ?? '';
      image.draggable = false;
      image.tabIndex = index === current ? 0 : -1;
      image.setAttribute('aria-keyshortcuts', 'Enter Space');
      image.setAttribute('aria-description', 'Press Enter or Space to zoom in or return to fit.');
      if (index === current && zoomScale > 1) image.sizes = zoomedImageSizes();
      const restoreFocus = document.activeElement === slide.querySelector('img');
      slide.replaceChildren(image);
      if (restoreFocus) image.focus({ preventScroll: true });
      if (index === current) applyZoom();
    }
  }

  function renderPreview(index: number) {
    const thumbnail = items[index].querySelector('img')!;
    const preview = thumbnail.cloneNode(true) as HTMLImageElement;
    preview.removeAttribute('srcset');
    preview.removeAttribute('loading');
    preview.alt = items[index].dataset.alt ?? '';
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
          if (openLink) {
            openLink.href = items[index].dataset.full || items[index].href;
            openLink.hidden = false;
          }
        }
      },
    );
  }

  function updatePagination() {
    if (!pagination) return;
    pagination.hidden =
      visibleCount === 0 || (options.hideSinglePagination === true && visibleCount === 1);
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
    const focusImage = changed && document.activeElement === activeImage();
    if (changed) {
      resetZoom();
      touchPoints.clear();
      pointer = undefined;
    }
    if (openLink) openLink.hidden = true;
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
    const photo = items[current];
    if (caption) {
      caption.textContent = photo.dataset.caption || '';
      caption.scrollTop = 0;
    }
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
      if (photoIndex === current) slide.removeAttribute('aria-hidden');
      else slide.setAttribute('aria-hidden', 'true');
      const image = slide.querySelector<HTMLImageElement>('img');
      if (image) image.tabIndex = photoIndex === current ? 0 : -1;
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
      if (openLink) {
        openLink.href = items[current].dataset.full || items[current].href;
        openLink.hidden = false;
      }
    } else {
      feedback.textContent = loadedImages.has(current) ? '' : 'Loading photograph…';
      retry.hidden = true;
    }
    syncCaptionFocus();
    if (focusImage) activeImage()?.focus({ preventScroll: true });
  }

  function open(trigger: HTMLAnchorElement, viaPointer: boolean) {
    items = getPhotos();
    visibleCount = items.length;

    const index = items.indexOf(trigger);
    if (index < 0) return;

    dialog.toggleAttribute(
      'data-has-captions',
      items.some((item) => Boolean(item.dataset.caption)),
    );

    close.toggleAttribute('data-pointer-open', viaPointer);

    opener = trigger;
    savedScroll = window.scrollY;
    bodyStyle = document.body.style.cssText;

    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScroll}px`;
    document.body.style.width = '100%';

    document.documentElement.classList.add('modal-open');

    dialog.showModal();
    show(index, 0);

    close.focus({ preventScroll: true });
  }

  function bind(trigger: HTMLAnchorElement, options: { space?: boolean } = {}) {
    trigger.setAttribute('aria-haspopup', 'dialog');

    trigger.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
        return;

      event.preventDefault();
      open(trigger, event.detail > 0);
    });

    if (options.space) {
      trigger.addEventListener('keydown', (event) => {
        if (event.key !== ' ') return;

        event.preventDefault();

        if (event.repeat || dialog.open) return;

        open(trigger, false);
      });
    }
  }

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
    if (openLink) openLink.hidden = true;
    loadImage(current);
  });
  dialog.addEventListener('keydown', (event) => {
    close.removeAttribute('data-pointer-open');
    if ((event.key === 'Enter' || event.key === ' ') && event.target === activeImage()) {
      event.preventDefault();
      const bounds = imageStage.getBoundingClientRect();
      toggleZoom(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      return;
    }
    if (event.key === 'Tab') {
      const controls = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([tabindex="-1"]), a[href]:not([tabindex="-1"]), [tabindex="0"]',
        ),
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
    if (event.isPrimary === false) {
      pointer = undefined;
      return;
    }
    swiped = false;
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
    syncCaptionFocus();
    track.style.transitionProperty = 'transform';
    track.style.transitionDuration = '0ms';
    setTrackPosition(current);
    updatePagination();
    applyZoom();
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
  function beginPan(id: number, point: { x: number; y: number }, suppressTap = false) {
    pan = { id, x: point.x, y: point.y, zoomX, zoomY, suppressTap };
    imageStage.setPointerCapture(id);
  }

  function finishSwipe(event: PointerEvent) {
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
    if (shouldAdvance) {
      swiped = true;
      show(current + direction);
    } else {
      if (event.pointerType === 'touch' && Math.hypot(dx, dy) <= 8) recordTap(event);
      else if (Math.hypot(dx, dy) > 8) lastTap = undefined;
      track.style.transitionProperty = 'transform';
      track.style.transitionDuration = reducedMotion() ? '0ms' : '280ms';
      setTrackPosition(current);
    }
  }

  imageStage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') {
      const point = { x: event.clientX, y: event.clientY };
      if (touchPoints.size === 0) swiped = false;
      touchPoints.set(event.pointerId, point);
      if (touchPoints.size >= 2) {
        swiped = true;
        beginPinch();
      } else if (zoomScale > 1) {
        pointer = undefined;
        beginPan(event.pointerId, point);
      } else {
        pointer = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          lastX: event.clientX,
          lastTime: event.timeStamp,
          velocity: 0,
          horizontal: false,
        };
      }
      return;
    }
    if (event.isPrimary === false || event.pointerType === 'mouse' || event.button !== 0) {
      pointer = undefined;
      return;
    }
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
    if (event.pointerType === 'touch' && touchPoints.has(event.pointerId)) {
      touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinch) {
        updatePinch();
        event.preventDefault();
        return;
      }
      if (pan?.id === event.pointerId) {
        const dx = event.clientX - pan.x;
        const dy = event.clientY - pan.y;
        if (Math.hypot(dx, dy) > 8) lastTap = undefined;
        zoomX = pan.zoomX + dx;
        zoomY = pan.zoomY + dy;
        applyZoom();
        event.preventDefault();
        return;
      }
    }
    if (!pointer || pointer.id !== event.pointerId) return;
    const elapsed = Math.max(event.timeStamp - pointer.lastTime, 1);
    pointer.velocity = (event.clientX - pointer.lastX) / elapsed;
    pointer.lastX = event.clientX;
    pointer.lastTime = event.timeStamp;
    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    if (!pointer.horizontal && Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) {
      pointer = undefined;
      lastTap = undefined;
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
    if (event.pointerType === 'touch' && touchPoints.has(event.pointerId)) {
      touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinch) {
        touchPoints.delete(event.pointerId);
        pointer = undefined;
        swiped = true;
        if (touchPoints.size >= 2) beginPinch();
        else {
          pinch = undefined;
          const [remaining] = touchPoints.entries();
          if (remaining) beginPan(remaining[0], remaining[1], true);
          else pan = undefined;
        }
        return;
      }
      if (pan?.id === event.pointerId) {
        const gesture = pan;
        touchPoints.delete(event.pointerId);
        pan = undefined;
        if (
          !gesture.suppressTap &&
          Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= 8
        )
          recordTap(event);
        else lastTap = undefined;
        return;
      }
      if (pointer?.id === event.pointerId) {
        touchPoints.delete(event.pointerId);
        finishSwipe(event);
        return;
      }
      touchPoints.delete(event.pointerId);
      return;
    }
    finishSwipe(event);
  });
  imageStage.addEventListener('pointercancel', (event) => {
    if (event.pointerType === 'touch' && touchPoints.has(event.pointerId)) {
      touchPoints.delete(event.pointerId);
      lastTap = undefined;
      if (pinch) {
        if (touchPoints.size >= 2) beginPinch();
        else {
          pinch = undefined;
          const [remaining] = touchPoints.entries();
          if (remaining) beginPan(remaining[0], remaining[1], true);
          else pan = undefined;
        }
      } else if (pan?.id === event.pointerId) pan = undefined;
    }
    if (!pointer || pointer.id !== event.pointerId) return;
    pointer = undefined;
    track.style.transitionProperty = 'transform';
    track.style.transitionDuration = reducedMotion() ? '0ms' : '280ms';
    setTrackPosition(current);
  });
  imageStage.addEventListener('click', (event) => {
    if (swiped || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (event instanceof PointerEvent && event.pointerType === 'touch') return;
    if (!(event.target instanceof HTMLImageElement) || event.target !== activeImage()) return;
    toggleZoom(event.clientX, event.clientY);
  });
  dialog.addEventListener('close', () => {
    resetZoom();
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
    touchPoints.clear();
    swiped = false;
    feedback.textContent = '';
    retry.hidden = true;
    if (openLink) openLink.hidden = true;
    document.documentElement.classList.remove('modal-open');
    document.body.style.cssText = bodyStyle;
    window.scrollTo({ top: savedScroll, behavior: 'instant' });
    opener?.focus({ preventScroll: true });
  });

  return { bind };
}
