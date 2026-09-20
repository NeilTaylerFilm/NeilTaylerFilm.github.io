type Photo = {
  src: string;
  srcset?: string;
  full?: string;
  alt: string;
  caption?: string;
  project?: string;
  width: number;
  height: number;
};

export function setupPhotographyViewer(root: HTMLElement) {
  const videoViewer = root.hasAttribute('data-video-viewer');
  const photos: Photo[] = JSON.parse(root.dataset.slides || '[]');
  if (!photos.length) return;
  const find = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const panel = find<HTMLElement>('[data-photo-panel]');
  const viewport = find<HTMLElement>('[data-photo-viewport]');
  const dialog = find<HTMLDialogElement>('[data-photo-dialog]');
  const expand = find<HTMLButtonElement>('[data-photo-expand]');
  const close = find<HTMLButtonElement>('[data-photo-close]');
  const previous = find<HTMLButtonElement>('[data-slide-prev]');
  const next = find<HTMLButtonElement>('[data-slide-next]');
  const caption = find<HTMLElement>('[data-slide-caption]');
  const project = find<HTMLAnchorElement>('[data-photo-project]');
  const count = find<HTMLElement>('[data-slide-count]');
  const status = find<HTMLElement>('[data-photo-status]');
  const strip = find<HTMLElement>('[data-photo-filmstrip]');
  const thumbnails = [...root.querySelectorAll<HTMLButtonElement>('[data-photo-index]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let image = find<HTMLImageElement>('[data-slide-image]');
  let current = 0;
  let selected = 0;
  let revision = 0;
  let frame = 0;
  let animations: Animation[] = [];
  let outgoing: HTMLImageElement | undefined;
  let pending: HTMLImageElement | undefined;
  let adjacent: { index: number; image: HTMLImageElement } | undefined;
  let opener: HTMLElement | null = null;
  let savedScroll = 0;
  let swipeStart: { x: number; y: number } | null = null;
  let suppressClick = false;

  previous.hidden = next.hidden = photos.length < 2;
  strip.hidden = photos.length < 2;
  expand.hidden = typeof dialog.showModal !== 'function';
  if (!expand.hidden && !videoViewer) {
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'button');
    viewport.setAttribute('aria-label', 'Expand photograph');
    viewport.setAttribute('aria-haspopup', 'dialog');
  }
  root.dataset.index = '0';

  // Loading spinner (inserted once, toggled via attribute)
  const spinner = document.createElement('div');
  spinner.className = 'photo-spinner';
  spinner.setAttribute('aria-hidden', 'true');
  viewport.appendChild(spinner);

  // Error state element (created on first error, reused)
  let errorEl: HTMLElement | null = null;

  function keepThumbnailVisible() {
    const thumb = thumbnails[selected];
    const item = thumb.getBoundingClientRect();
    const area = strip.getBoundingClientRect();
    if (item.left < area.left + 8) strip.scrollLeft += item.left - area.left - 8;
    else if (item.right > area.right - 8) strip.scrollLeft += item.right - area.right + 8;
  }

  function highlight() {
    thumbnails.forEach((thumb, index) => {
      thumb.tabIndex = index === selected ? 0 : -1;
      if (index === selected) thumb.setAttribute('aria-current', 'true');
      else thumb.removeAttribute('aria-current');
    });
    keepThumbnailVisible();
  }

  function settle() {
    animations.forEach((animation) => animation.cancel());
    animations = [];
    outgoing?.remove();
    outgoing = undefined;
    image.style.transform = '';
  }

  function makeImage(index: number) {
    const photo = photos[index];
    const candidate = new Image();
    candidate.sizes = dialog.open ? '100vw' : '(max-width: 1440px) 90vw, 1248px';
    candidate.srcset = photo.srcset || '';
    candidate.src = photo.src;
    candidate.alt = photo.alt;
    candidate.width = photo.width;
    candidate.height = photo.height;
    candidate.decoding = 'async';
    candidate.draggable = false;
    return candidate;
  }

  function preload(direction: number) {
    if (
      photos.length < 2 ||
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    )
      return;
    const index = (current + direction + photos.length) % photos.length;
    if (adjacent?.index === index) return;
    // Only one adjacent full-size frame is kept; thumbnails use the smallest export.
    adjacent = { index, image: makeImage(index) };
    void adjacent.image.decode().catch(() => {});
  }

  function showError(index: number) {
    const photo = photos[index];
    status.textContent = 'This photograph could not load. Please try again.';
    viewport.setAttribute('aria-busy', 'false');
    viewport.removeAttribute('data-loading');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'photo-error';
      errorEl.setAttribute('role', 'alert');
      const msg = document.createElement('span');
      msg.textContent = 'Failed to load';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Retry';
      btn.setAttribute('aria-label', `Retry loading ${photo.alt || 'image'}`);
      btn.addEventListener('click', () => {
        if (errorEl) errorEl.remove();
        errorEl = null;
        select(index, index >= selected ? 1 : -1);
      });
      errorEl.append(msg, btn);
    }
    // Reparent to current viewport
    viewport.appendChild(errorEl);
    errorEl.hidden = false;
  }

  function clearError() {
    if (errorEl) {
      errorEl.hidden = true;
    }
  }

  async function load(index: number, direction: number, token: number) {
    if (index === current) {
      status.textContent = '';
      viewport.removeAttribute('aria-busy');
      viewport.removeAttribute('data-loading');
      clearError();
      return;
    }
    const candidate = adjacent?.index === index ? adjacent.image : makeImage(index);
    if (adjacent?.image === candidate) adjacent = undefined;
    pending = candidate;
    viewport.setAttribute('aria-busy', 'true');
    viewport.setAttribute('data-loading', '');
    clearError();
    try {
      await candidate.decode();
    } catch {
      if (token !== revision) return;
      pending = undefined;
      selected = current;
      highlight();
      viewport.removeAttribute('aria-busy');
      viewport.removeAttribute('data-loading');
      showError(index);
      return;
    }
    if (token !== revision) return;
    pending = undefined;
    settle();
    const old = image;
    old.removeAttribute('data-slide-image');
    old.alt = '';
    old.setAttribute('aria-hidden', 'true');
    candidate.setAttribute('data-slide-image', '');
    viewport.append(candidate);
    image = candidate;
    outgoing = old;
    current = index;
    root.dataset.index = String(current);
    root.dispatchEvent(new Event('photo-change'));
    const photo = photos[current];
    caption.textContent = photo.caption || '';
    project.hidden = !photo.project;
    if (photo.project)
      project.href = `${root.dataset.projectBase || '/photography/'}${photo.project}/`;
    else project.removeAttribute('href');
    count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
    status.textContent = '';
    viewport.removeAttribute('aria-busy');
    viewport.removeAttribute('data-loading');
    clearError();
    if (!reduced.matches) {
      const options = { duration: 180, easing: 'cubic-bezier(0.2, 0.7, 0.25, 1)' };
      animations = [
        old.animate(
          [{ transform: 'translateX(0)' }, { transform: `translateX(${-direction * 100}%)` }],
          options,
        ),
        candidate.animate(
          [{ transform: `translateX(${direction * 100}%)` }, { transform: 'translateX(0)' }],
          options,
        ),
      ];
      const active = animations;
      void Promise.all(active.map((animation) => animation.finished.catch(() => {}))).then(() => {
        old.remove();
        if (animations === active) {
          animations = [];
          outgoing = undefined;
        }
      });
    } else {
      old.remove();
      outgoing = undefined;
    }
    preload(direction);
  }

  function select(index: number, direction: number) {
    selected = (index + photos.length) % photos.length;
    revision++;
    const token = revision;
    settle();
    if (pending) {
      pending.removeAttribute('srcset');
      pending.removeAttribute('src');
      pending = undefined;
    }
    highlight();
    cancelAnimationFrame(frame);
    if (selected !== current) {
      viewport.setAttribute('aria-busy', 'true');
      status.textContent = `Loading photograph ${selected + 1} of ${photos.length}.`;
    }
    // Coalesce input within a frame; never queue a series of animations.
    frame = requestAnimationFrame(() => void load(selected, direction, token));
  }

  function step(direction: number) {
    select(selected + direction, direction);
  }
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  thumbnails.forEach((thumb, index) => {
    thumb.addEventListener('click', () => select(index, index >= selected ? 1 : -1));
  });

  panel.addEventListener('keydown', (event) => {
    const thumb = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-photo-index]');
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const direction = event.key === 'ArrowLeft' || event.key === 'Home' ? -1 : 1;
      const index =
        event.key === 'Home' ? 0 : event.key === 'End' ? photos.length - 1 : selected + direction;
      select(index, direction);
      if (thumb) thumbnails[selected].focus({ preventScroll: true });
    }
    if (event.target === viewport && !dialog.open && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      openViewer();
    }
  });

  function openViewer(source: HTMLElement = viewport) {
    if (dialog.open || expand.hidden) return;
    settle();
    opener = source;
    savedScroll = window.scrollY;
    root.style.height = `${root.getBoundingClientRect().height}px`;
    dialog.append(panel);
    dialog.showModal();
    document.documentElement.classList.add('modal-open');
    viewport.removeAttribute('role');
    viewport.removeAttribute('tabIndex');
    viewport.removeAttribute('aria-label');
    viewport.removeAttribute('aria-haspopup');
    image.sizes = '100vw';
    close.focus({ preventScroll: true });
    requestAnimationFrame(keepThumbnailVisible);
  }

  expand.addEventListener('click', () => openViewer(expand));
  close.addEventListener('click', () => dialog.close());
  viewport.addEventListener('click', () => {
    if (videoViewer) return;
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    openViewer();
  });
  dialog.addEventListener('close', () => {
    settle();
    root.prepend(panel);
    root.style.height = '';
    document.documentElement.classList.remove('modal-open');
    if (!videoViewer) {
      viewport.tabIndex = 0;
      viewport.setAttribute('role', 'button');
      viewport.setAttribute('aria-label', 'Expand photograph');
      viewport.setAttribute('aria-haspopup', 'dialog');
    }
    image.sizes = '(max-width: 1440px) 90vw, 1248px';
    window.scrollTo({ top: savedScroll, behavior: 'instant' });
    opener?.focus({ preventScroll: true });
    keepThumbnailVisible();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...panel.querySelectorAll<HTMLElement>('button, a[href]')].filter(
      (control) => control.tabIndex >= 0 && control.getClientRects().length > 0,
    );
    const first = controls[0],
      last = controls.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  viewport.addEventListener(
    'touchstart',
    (event) => {
      suppressClick = false;
      swipeStart =
        event.touches.length === 1
          ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
          : null;
    },
    { passive: true },
  );
  viewport.addEventListener(
    'touchend',
    (event) => {
      if (!swipeStart) return;
      const dx = event.changedTouches[0].clientX - swipeStart.x;
      const dy = event.changedTouches[0].clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        suppressClick = true;
        step(dx < 0 ? 1 : -1);
      }
    },
    { passive: true },
  );
  viewport.addEventListener(
    'touchcancel',
    () => {
      swipeStart = null;
    },
    { passive: true },
  );
  new ResizeObserver(() => {
    settle();
    keepThumbnailVisible();
  }).observe(viewport);
  reduced.addEventListener('change', settle);
  void image
    .decode()
    .then(() => preload(1))
    .catch(() => {});
}
