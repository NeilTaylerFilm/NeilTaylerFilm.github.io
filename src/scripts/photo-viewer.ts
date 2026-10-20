import { isYoutubeThumbnailPlaceholder, youtubeEmbedUrl } from '../lib/youtube.ts';

let viewerSequence = 0;

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
  const watchLink = dialog.querySelector<HTMLAnchorElement>('[data-portfolio-watch]');
  const caption = dialog.querySelector<HTMLElement>('[data-portfolio-caption]');
  const viewerId = `viewer-${++viewerSequence}`;
  const historyKey = `__ntfPhotoViewer_${viewerId}`;
  const supportsViewerHistory =
    typeof window !== 'undefined' &&
    typeof window.history?.pushState === 'function' &&
    typeof window.history?.replaceState === 'function' &&
    typeof window.history?.back === 'function';
  function syncCaptionFocus() {
    if (!caption) return;

    if (caption.scrollHeight > caption.clientHeight + 1) {
      caption.tabIndex = 0;
      caption.setAttribute('role', 'region');
      caption.setAttribute(
        'aria-label',
        items.some((_, index) => isVideo(index)) ? 'Media caption' : 'Photo caption',
      );
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
  let historySession = 0;
  let activeHistorySession: number | null = null;
  let awaitingBack = false;
  let closingFromHistory = false;
  let queuedOpen:
    { trigger: HTMLAnchorElement; viaPointer: boolean; startVideo: boolean } | undefined;
  let closeCleaned = true;
  let inlinePlayer:
    | {
        trigger: HTMLAnchorElement;
        figure: HTMLElement;
        player: HTMLElement;
        iframe: HTMLIFrameElement;
        ariaHidden: string | null;
        tabIndex: string | null;
      }
    | undefined;

  function isVideo(index: number) {
    return items[index]?.dataset.mediaType === 'video' || Boolean(items[index]?.dataset.videoId);
  }

  function targetMatches(target: EventTarget | null, selectors: string) {
    const candidate = target as
      (EventTarget & { closest?: (value: string) => Element | null }) | null;
    return Boolean(
      candidate && typeof candidate.closest === 'function' && candidate.closest(selectors),
    );
  }

  function historyState(state: unknown, marker?: { session: number; index: number }) {
    const base =
      state && typeof state === 'object' ? { ...(state as Record<string, unknown>) } : {};
    if (marker) base[historyKey] = { viewerId, ...marker };
    else delete base[historyKey];
    return base;
  }

  function currentHistoryMarker(
    state: unknown = supportsViewerHistory ? window.history.state : undefined,
  ) {
    if (!state || typeof state !== 'object') return undefined;
    const marker = (state as Record<string, unknown>)[historyKey];
    if (!marker || typeof marker !== 'object') return undefined;
    const value = marker as { viewerId?: unknown; session?: unknown; index?: unknown };
    return value.viewerId === viewerId &&
      Number.isInteger(value.session) &&
      Number.isInteger(value.index)
      ? { session: value.session as number, index: value.index as number }
      : undefined;
  }

  function updateHistoryIndex() {
    if (!supportsViewerHistory || activeHistorySession === null || awaitingBack) return;
    const marker = currentHistoryMarker();
    if (marker?.session !== activeHistorySession) return;
    window.history.replaceState(
      historyState(window.history.state, { session: activeHistorySession, index: current }),
      '',
      window.location.href,
    );
  }

  function leaveViewerHistory() {
    if (!supportsViewerHistory || activeHistorySession === null) return;
    const marker = currentHistoryMarker();
    const shouldGoBack = marker?.session === activeHistorySession;
    activeHistorySession = null;
    if (shouldGoBack && !awaitingBack) {
      awaitingBack = true;
      window.history.back();
    }
  }

  function closeViewer() {
    if (!dialog.open) return;
    leaveViewerHistory();
    stopVideoPlayers();
    dialog.close();
  }

  function stopVideoPlayers() {
    track.querySelectorAll<HTMLIFrameElement>('iframe').forEach((iframe) => {
      iframe.src = 'about:blank';
      iframe.remove();
    });
  }

  function stopInlineVideo() {
    if (!inlinePlayer) return;
    const restoreFocus = inlinePlayer.player.contains(document.activeElement);
    inlinePlayer.iframe.src = 'about:blank';
    inlinePlayer.player.remove();
    if (inlinePlayer.ariaHidden === null) inlinePlayer.trigger.removeAttribute('aria-hidden');
    else inlinePlayer.trigger.setAttribute('aria-hidden', inlinePlayer.ariaHidden);
    if (inlinePlayer.tabIndex === null) inlinePlayer.trigger.removeAttribute('tabindex');
    else inlinePlayer.trigger.setAttribute('tabindex', inlinePlayer.tabIndex);
    inlinePlayer.figure.removeAttribute('data-video-playing');
    if (restoreFocus) inlinePlayer.trigger.focus({ preventScroll: true });
    inlinePlayer = undefined;
  }

  function finishClose() {
    if (closeCleaned) return;
    closeCleaned = true;
    stopVideoPlayers();
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
    if (watchLink) watchLink.hidden = true;
    dialog.removeAttribute('data-video-active');
    document.documentElement.classList.remove('modal-open');
    document.body.style.cssText = bodyStyle;
    window.scrollTo({ top: savedScroll, behavior: 'instant' });
    opener?.focus({ preventScroll: true });
  }

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
    if (isVideo(current)) return undefined;
    return slidesByPhoto.get(current)?.querySelector<HTMLImageElement>('img');
  }

  function zoomedImageSizes() {
    return `${Math.ceil((imageStage.clientWidth || window.innerWidth) * maxZoom)}px`;
  }

  function applyZoom(animate = false) {
    if (isVideo(current)) return;
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
    if (isVideo(current)) return;
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

  function videoTitle(index: number) {
    return (
      items[index].dataset.title ||
      items[index].dataset.alt ||
      items[index].dataset.caption ||
      'YouTube video'
    );
  }

  function createVideoFrame(videoId: string, title: string) {
    const iframe = document.createElement('iframe');
    iframe.title = title;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.loading = 'eager';
    iframe.setAttribute('frameborder', '0');
    iframe.src = youtubeEmbedUrl(videoId);
    return iframe;
  }

  function shouldPlayInline(trigger: HTMLAnchorElement) {
    const { width, height } = trigger.getBoundingClientRect();
    const galleryWidth =
      trigger.closest('.gallery')?.getBoundingClientRect().width || window.innerWidth;
    return (width >= 480 && height >= 270) || (width >= galleryWidth * 0.85 && height >= 180);
  }

  function playInlineVideo(trigger: HTMLAnchorElement) {
    const figure = trigger.closest<HTMLElement>('.gallery-item--video');
    const videoId = trigger.dataset.videoId;
    if (!figure || !videoId) return false;

    stopInlineVideo();
    const iframe = createVideoFrame(
      videoId,
      trigger.dataset.title || trigger.dataset.alt || 'YouTube video',
    );
    const player = document.createElement('div');
    player.className = 'gallery-video-player';
    player.append(iframe);
    trigger.insertAdjacentElement('afterend', player);
    figure.setAttribute('data-video-playing', '');
    const ariaHidden = trigger.getAttribute('aria-hidden');
    const tabIndex = trigger.getAttribute('tabindex');
    trigger.setAttribute('aria-hidden', 'true');
    trigger.tabIndex = -1;
    inlinePlayer = { trigger, figure, player, iframe, ariaHidden, tabIndex };
    figure.addEventListener('gallery-will-reflow', stopInlineVideo, { once: true });
    iframe.focus({ preventScroll: true });
    return true;
  }

  function activate(trigger: HTMLAnchorElement, viaPointer: boolean) {
    stopInlineVideo();
    if (awaitingBack) {
      queuedOpen = { trigger, viaPointer, startVideo: true };
      return;
    }
    if (trigger.dataset.videoId && shouldPlayInline(trigger) && playInlineVideo(trigger)) return;
    open(trigger, viaPointer, undefined, true);
  }

  function sizeVideoBox(box: HTMLElement, index: number) {
    const bounds = imageStage.getBoundingClientRect();
    const ratio = Number(items[index].dataset.ratio) || 16 / 9;
    const availableWidth = Math.max(0, (bounds.width || window.innerWidth) - 16);
    const availableHeight = bounds.height || window.innerHeight;
    let width = Math.min(availableWidth, availableHeight * ratio);
    let height = width / ratio;
    if (height > availableHeight) {
      height = availableHeight;
      width = height * ratio;
    }
    const minimumWidth = Math.max(200, 200 * ratio);
    const minimumHeight = minimumWidth / ratio;
    if (
      width < minimumWidth &&
      minimumWidth <= availableWidth &&
      minimumHeight <= availableHeight
    ) {
      width = minimumWidth;
      height = minimumHeight;
    }
    box.style.width = `${Math.max(0, width)}px`;
    box.style.height = `${Math.max(0, height)}px`;
    box.style.aspectRatio = String(ratio);
  }

  function renderVideoPreview(index: number) {
    const slide = slidesByPhoto.get(index);
    if (!slide || slide.querySelector('iframe')) return;
    const currentPreview = slide.querySelector<HTMLElement>('[data-video-preview]');
    if (currentPreview?.querySelector('[data-video-play]')) {
      sizeVideoBox(currentPreview, index);
      return;
    }

    const tileImage = items[index].querySelector('img');
    const box = document.createElement('div');
    box.className = 'portfolio-video portfolio-video-poster';
    box.dataset.videoPreview = '';
    sizeVideoBox(box, index);

    if (tileImage) {
      const image = tileImage.cloneNode(true) as HTMLImageElement;
      image.removeAttribute('srcset');
      image.removeAttribute('loading');
      image.removeAttribute('sizes');
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      image.draggable = false;
      image.addEventListener(
        'load',
        () => {
          if (image.hasAttribute('data-youtube-thumbnail') && isYoutubeThumbnailPlaceholder(image))
            image.hidden = true;
        },
        { once: true },
      );
      image.src = tileImage.currentSrc || tileImage.src;
      image.addEventListener('error', () => (image.hidden = true), { once: true });
      if (
        image.complete &&
        (image.naturalWidth === 0 ||
          (image.hasAttribute('data-youtube-thumbnail') && isYoutubeThumbnailPlaceholder(image)))
      ) {
        image.hidden = true;
      }
      box.append(image);
    }

    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'portfolio-video-play';
    play.dataset.videoPlay = '';
    play.textContent = '▶ Play video';
    play.setAttribute('aria-label', `Play video: ${videoTitle(index)}`);
    play.tabIndex = index === current ? 0 : -1;
    play.addEventListener('click', () => playVideo(index));
    box.append(play);
    slide.replaceChildren(box);
  }

  function playVideo(index: number) {
    if (index !== current || !isVideo(index)) return;
    const videoId = items[index].dataset.videoId;
    if (!videoId) return;
    const box = slidesByPhoto.get(index)?.querySelector<HTMLElement>('[data-video-preview]');
    if (!box || box.querySelector('iframe')) return;

    const iframe = createVideoFrame(videoId, videoTitle(index));
    box.replaceChildren(iframe);
    iframe.focus({ preventScroll: true });
  }

  function stopVideo(index: number) {
    const iframe = slidesByPhoto.get(index)?.querySelector<HTMLIFrameElement>('iframe');
    if (!iframe) return;
    iframe.src = 'about:blank';
    iframe.remove();
    renderVideoPreview(index);
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
    if (isVideo(index)) {
      renderVideoPreview(index);
      return;
    }
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
    const label = `${isVideo(current) ? 'Video' : 'Photo'} ${current + 1} of ${visibleCount}`;
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
      dot.setAttribute(
        'aria-label',
        `${isVideo(index) ? 'Video' : 'Photo'} ${index + 1} of ${visibleCount}`,
      );
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
    const focusMedia =
      changed &&
      (document.activeElement === activeImage() ||
        (isVideo(current) &&
          Boolean(slidesByPhoto.get(current)?.contains(document.activeElement))));
    if (changed) {
      if (isVideo(current)) stopVideo(current);
      resetZoom();
      touchPoints.clear();
      pointer = undefined;
    }
    if (openLink) openLink.hidden = true;
    if (watchLink) watchLink.hidden = true;
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
    const video = isVideo(current);
    dialog.toggleAttribute('data-video-active', video);
    previous.setAttribute(
      'aria-label',
      items.some((_, itemIndex) => isVideo(itemIndex)) ? 'Previous media' : 'Previous photograph',
    );
    next.setAttribute(
      'aria-label',
      items.some((_, itemIndex) => isVideo(itemIndex)) ? 'Next media' : 'Next photograph',
    );
    if (caption) {
      caption.textContent = photo.dataset.caption || '';
      caption.scrollTop = 0;
    }
    if (watchLink && video) {
      watchLink.href = photo.href;
      watchLink.hidden = false;
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
      if (isVideo(photoIndex)) {
        renderPreview(photoIndex);
        return;
      }
      const image = loadedImages.get(photoIndex);
      if (image) renderImage(photoIndex, image);
      else renderPreview(photoIndex);
      loadImage(photoIndex);
    });
    if (!video && failedImages.has(current)) {
      feedback.textContent = 'This photograph could not load. Please try again.';
      retry.hidden = false;
      if (openLink) {
        openLink.href = items[current].dataset.full || items[current].href;
        openLink.hidden = false;
      }
    } else if (video) {
      feedback.textContent = '';
      retry.hidden = true;
    } else {
      feedback.textContent = loadedImages.has(current) ? '' : 'Loading photograph…';
      retry.hidden = true;
    }
    updateHistoryIndex();
    syncCaptionFocus();
    if (focusMedia) {
      const slide = slidesByPhoto.get(current);
      const focusTarget = isVideo(current)
        ? slide?.querySelector<HTMLElement>('[data-video-play]')
        : activeImage();
      (focusTarget ?? close).focus({ preventScroll: true });
    }
  }

  function open(
    trigger: HTMLAnchorElement,
    viaPointer: boolean,
    restoredSession?: number,
    startVideo = false,
  ) {
    if (awaitingBack && restoredSession === undefined) {
      queuedOpen = { trigger, viaPointer, startVideo };
      return;
    }
    stopInlineVideo();
    if (!dialog.open && !closeCleaned) finishClose();
    items = getPhotos();
    visibleCount = items.length;

    const index = items.indexOf(trigger);
    if (index < 0) return;

    if (restoredSession === undefined && supportsViewerHistory) {
      const session = ++historySession;
      activeHistorySession = session;
      window.history.pushState(
        historyState(window.history.state, { session, index }),
        '',
        window.location.href,
      );
    } else if (restoredSession !== undefined) {
      activeHistorySession = restoredSession;
    } else {
      activeHistorySession = null;
    }
    closeCleaned = false;
    closingFromHistory = false;

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
    if (startVideo && isVideo(index)) playVideo(index);
  }

  function bind(trigger: HTMLAnchorElement, options: { space?: boolean } = {}) {
    if (!trigger.dataset.videoId) trigger.setAttribute('aria-haspopup', 'dialog');

    trigger.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
        return;

      event.preventDefault();
      activate(trigger, event.detail > 0);
    });

    if (options.space) {
      trigger.addEventListener('keydown', (event) => {
        if (event.key !== ' ') return;

        event.preventDefault();

        if (event.repeat || dialog.open) return;

        activate(trigger, false);
      });
    }
  }

  close.addEventListener('blur', () => close.removeAttribute('data-pointer-open'));
  close.addEventListener('click', closeViewer);
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
          'button:not([disabled]):not([tabindex="-1"]), a[href]:not([tabindex="-1"]), iframe, [tabindex="0"]',
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
    if (
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !targetMatches(event.target, 'input, select, textarea, iframe, [contenteditable="true"]')
    ) {
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
      closeViewer();
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
      closeViewer();
  });
  dialog.addEventListener('cancel', () => {
    leaveViewerHistory();
    stopVideoPlayers();
  });
  if (supportsViewerHistory)
    window.addEventListener('popstate', (event) => {
      if (awaitingBack) {
        awaitingBack = false;
        const pending = queuedOpen;
        queuedOpen = undefined;
        if (pending) {
          if (
            pending.startVideo &&
            pending.trigger.dataset.videoId &&
            shouldPlayInline(pending.trigger)
          )
            playInlineVideo(pending.trigger);
          else open(pending.trigger, pending.viaPointer, undefined, pending.startVideo);
        }
        return;
      }

      const marker = currentHistoryMarker(event.state);
      if (marker) {
        if (!dialog.open) {
          items = getPhotos();
          const trigger = items[marker.index];
          if (trigger) open(trigger, false, marker.session);
        } else if (activeHistorySession === marker.session && marker.index !== current) {
          show(marker.index, 0);
        }
        return;
      }

      if (dialog.open && activeHistorySession !== null) {
        activeHistorySession = null;
        closingFromHistory = true;
        stopVideoPlayers();
        dialog.close();
      }
    });
  window.addEventListener('pagehide', stopInlineVideo);
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
    if (isVideo(current)) {
      const box = slidesByPhoto.get(current)?.querySelector<HTMLElement>('.portfolio-video');
      if (box) sizeVideoBox(box, current);
    }
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
    if (
      targetMatches(
        event.target,
        'button, a, iframe, input, select, textarea, [contenteditable="true"]',
      )
    ) {
      pointer = undefined;
      return;
    }
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
    if (dialog.open) return;
    if (closingFromHistory) closingFromHistory = false;
    else if (activeHistorySession !== null) leaveViewerHistory();
    activeHistorySession = null;
    finishClose();
  });

  return { bind };
}
