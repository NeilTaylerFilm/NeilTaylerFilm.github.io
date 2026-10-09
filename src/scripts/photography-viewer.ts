// ==========================================
// 📽️ INTERACTIVE PHOTO & VIDEO VIEWER ENGINE
// ==========================================
// Think of this file as the robotic brain behind your interactive slideshow!
// When a visitor opens the gallery, this code:
// 1. Listens for clicks on "Next" / "Previous" buttons or thumbnail taps.
// 2. Listens for finger swipes on phones and arrow keys on keyboards.
// 3. Glides photos smoothly across the screen like a movie projector.
// 4. Opens photos into full-screen theater mode when clicked.

// 📋 What information each slide carries:
type Photo = {
  // Web link to the photo
  src: string;
  // Different sizes for different screen resolutions
  srcset?: string;
  // Maximum resolution version
  full?: string;
  // Screen reader description
  alt: string;
  // Caption text
  caption?: string;
  // Project folder link
  project?: string;
  // Pixel width
  width: number;
  // Pixel height
  height: number;
};

// 🎬 MAIN CONTROLLER: Starts up the slideshow on the webpage
// What goes in: A slideshow container element (root) from the webpage DOM.
// What comes out: Wires up the interactive slideshow, buttons, swipes, keyboard controls, and preloaders!
export function setupPhotographyViewer(root: HTMLElement) {
  // Is this viewer showing videos or still photos?
  // (In video mode, clicking the screen plays the film rather than expanding to fullscreen theater).
  const videoViewer = root.hasAttribute('data-video-viewer');

  // Read the list of slides baked into the page's HTML data
  const photos: Photo[] = JSON.parse(root.dataset.slides || '[]');
  // If there are no photos to show, go to sleep
  if (!photos.length) return;

  // 🔍 Helper shortcut to grab elements inside this gallery widget
  const find = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;

  // 🎮 Grabbing all the interactive buttons and screen elements:
  // The whole viewer box
  const panel = find<HTMLElement>('[data-photo-panel]');
  // The window frame where the photo sits
  const viewport = find<HTMLElement>('[data-photo-viewport]');
  // The full-screen pop-up modal
  const dialog = find<HTMLDialogElement>('[data-photo-dialog]');
  // "Go Fullscreen" button
  const expand = find<HTMLButtonElement>('[data-photo-expand]');
  // "Exit Fullscreen" button
  const close = find<HTMLButtonElement>('[data-photo-close]');
  // "Previous Slide" arrow
  const previous = find<HTMLButtonElement>('[data-slide-prev]');
  // "Next Slide" arrow
  const next = find<HTMLButtonElement>('[data-slide-next]');
  // Subtitle text area
  const caption = find<HTMLElement>('[data-slide-caption]');
  // Link to the full project
  const project = find<HTMLAnchorElement>('[data-photo-project]');
  // Slide counter (e.g. "01 / 10")
  const count = find<HTMLElement>('[data-slide-count]');
  // Hidden message box for screen readers
  const status = find<HTMLElement>('[data-photo-status]');
  // The row of tiny thumbnail buttons at bottom
  const strip = find<HTMLElement>('[data-photo-filmstrip]');
  // All thumbnail buttons
  const thumbnails = [...root.querySelectorAll<HTMLButtonElement>('[data-photo-index]')];
  // Does the user get motion sickness?
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  // The current visible picture
  let image = find<HTMLImageElement>('[data-slide-image]');
  // Low-res placeholder image
  const preview = viewport.querySelector<HTMLImageElement>('.photo-preview');

  // 🧠 Memory variables that remember where we are:
  // The index of the photo showing right now
  let current = 0;
  // The photo we want to show next
  let selected = 0;
  // Each new selection gets a number; old downloads must match it before changing the screen.
  let revision = 0;
  // Screen refresh tick (requestAnimationFrame)
  let frame = 0;
  // Currently playing slide transition animations
  let animations: Animation[] = [];
  // The old photo sliding off screen
  let outgoing: HTMLImageElement | undefined;
  // The next photo waiting to download
  let pending: HTMLImageElement | undefined;
  // Next picture secretly loaded in background
  let adjacent: { index: number; image: HTMLImageElement } | undefined;
  // If an image failed, remember which one broke
  let failedIndex = 0;
  // Remember what button was focused before opening fullscreen
  let opener: HTMLElement | null = null;
  // Remember how far down the page the visitor had scrolled
  let savedScroll = 0;
  // Where user's finger first touched the screen
  let swipeStart: { x: number; y: number } | null = null;
  // Prevents an accidental click when finishing a swipe gesture
  let suppressClick = false;

  // ⚙️ Initial UI Setup:
  // If there's only 1 photo, hide next/previous arrows and the bottom filmstrip
  previous.hidden = next.hidden = photos.length < 2;
  strip.hidden = photos.length < 2;
  // If the browser doesn't support dialog modals, hide the fullscreen button
  expand.hidden = typeof dialog.showModal !== 'function';

  // Make the main photo clickable like a button to open fullscreen theater mode
  if (!expand.hidden && !videoViewer) {
    viewport.tabIndex = 0;
    viewport.setAttribute('role', 'button');
    viewport.setAttribute('aria-label', 'Expand photograph');
    viewport.setAttribute('aria-haspopup', 'dialog');
  }
  root.dataset.index = '0';

  // If the main image is already loaded, remove the blurry preview placeholder
  if (image.complete && !image.naturalWidth) preview?.remove();
  image.addEventListener('error', () => preview?.remove(), { once: true });

  // Loading spinner (inserted once, toggled via attribute)
  // 🔄 Loading spinner (inserted once, toggled via attribute)
  const spinner = document.createElement('div');
  spinner.className = 'photo-spinner';
  spinner.setAttribute('aria-hidden', 'true');
  viewport.appendChild(spinner);

  // Error state element (created on first error, reused)
  // ⚠️ Error state element (created on first error, reused)
  let errorEl: HTMLElement | null = null;


  // 📜 HELPER: Keeps the active thumbnail centered in the bottom filmstrip
  function keepThumbnailVisible() {
    const thumb = thumbnails[selected];
    const item = thumb.getBoundingClientRect();
    const area = strip.getBoundingClientRect();
    if (item.left < area.left + 8) strip.scrollLeft += item.left - area.left - 8;
    else if (item.right > area.right - 8) strip.scrollLeft += item.right - area.right + 8;
  }

  // 💡 HELPER: Lights up the chosen thumbnail and un-lights all the others
  function highlight() {
    thumbnails.forEach((thumb, index) => {
      thumb.tabIndex = index === selected ? 0 : -1;
      if (index === selected) thumb.setAttribute('aria-current', 'true');
      else thumb.removeAttribute('aria-current');
    });
    keepThumbnailVisible();
  }

  // 🛑 HELPER: Halts any currently moving slide animations so nothing gets tangled
  function settle() {
    animations.forEach((animation) => animation.cancel());
    animations = [];
    outgoing?.remove();
    outgoing = undefined;
    image.style.transform = '';
  }

  // 🎨 HELPER: Constructs a fresh new picture card in memory with all size options
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

  // 🚀 HELPER: Sneakily downloads the NEXT picture in advance so clicking next is instant!
  function preload(direction: number) {
    // Skip preloading if there's only 1 photo or if the user is on mobile "Data Saver" mode
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

  // ⚠️ HELPER: Shows a friendly error badge with a "Retry" button if an image fails to load
  function showError(index: number) {
    const photo = photos[index];
    failedIndex = index;
    status.textContent = 'This photograph could not load. Please try again.';
    viewport.setAttribute('aria-busy', 'false');
    viewport.setAttribute('data-error', '');
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
      btn.addEventListener('click', () => {
        if (errorEl) errorEl.remove();
        errorEl = null;
        select(failedIndex, failedIndex >= selected ? 1 : -1);
      });
      errorEl.append(msg, btn);
    }
    errorEl
      .querySelector('button')
      ?.setAttribute('aria-label', `Retry loading ${photo.alt || 'image'}`);
    // Reparent to current viewport
    viewport.appendChild(errorEl);
    errorEl.hidden = false;
  }

  // 🧹 HELPER: Hides the error message when everything is fine
  function clearError() {
    viewport.removeAttribute('data-error');
    if (errorEl) {
      errorEl.hidden = true;
    }
  }

  // 🔀 CORE FUNCTION: Loads the new photo and performs the smooth sliding transition!
  async function load(index: number, direction: number, token: number) {
    // If we're already on this exact picture and there's no error, nothing to do
    if (index === current && !viewport.hasAttribute('data-error')) {
      status.textContent = '';
      viewport.removeAttribute('aria-busy');
      viewport.removeAttribute('data-loading');
      clearError();
      return;
    }
    // Use the sneakily preloaded image if available, or create a new one
    const candidate = adjacent?.index === index ? adjacent.image : makeImage(index);
    if (adjacent?.image === candidate) adjacent = undefined;
    pending = candidate;
    viewport.setAttribute('aria-busy', 'true');
    viewport.setAttribute('data-loading', '');
    clearError();
    // Wait for the browser to finish decoding the image pixels
    try {
      await candidate.decode();
    } catch {
      // A slow photo may fail after a newer click; only report errors for the current choice.
      if (token !== revision) return;
      pending = undefined;
      selected = current;
      highlight();
      viewport.removeAttribute('aria-busy');
      viewport.removeAttribute('data-loading');
      showError(index);
      return;
    }
    // Do not let an older download replace a newer photo chosen by the visitor.
    if (token !== revision) return;
    pending = undefined;
    settle();

    // Swap the old image with the new image in the DOM
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

    // Update caption, project link, and counter (e.g. "02 / 10")
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

    // 🎞️ Animate the transition: glide old photo out and new photo in!
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
      // If user prefers reduced motion, skip sliding animation instantly
      old.remove();
      outgoing = undefined;
    }
    // Preload the next photo in line
    preload(direction);
  }


  // 🎯 SELECTOR: Chooses which photo index to switch to (handles looping around!)
  function select(index: number, direction: number) {
    // Wrap around like a carousel: if you go past the end, loop back to the beginning!
    const nextIndex = (index + photos.length) % photos.length;
    if (nextIndex === selected && !pending && !viewport.hasAttribute('data-error')) return;
    preview?.remove();
    selected = nextIndex;
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
    // Schedule the slide load on the very next screen refresh tick
    // Coalesce input within a frame; never queue a series of animations.
    frame = requestAnimationFrame(() => void load(selected, direction, token));
  }

  // 👣 STEPPER: Move forward (+1) or backward (-1) by one photo
  function step(direction: number) {
    select(selected + direction, direction);
  }

  // 🖱️ MOUSE & CLICK LISTENERS:
  // Left arrow click
  previous.addEventListener('click', () => step(-1));
  // Right arrow click
  next.addEventListener('click', () => step(1));
  // Clicking any filmstrip thumbnail
  thumbnails.forEach((thumb, index) => {
    thumb.addEventListener('click', () => select(index, index >= selected ? 1 : -1));
  });

  // ⌨️ KEYBOARD NAVIGATION:
  // - Left Arrow: previous photo
  // - Right Arrow: next photo
  // - Home: jump to first photo
  // - End: jump to last photo
  // - Enter or Space: expand to fullscreen theater mode
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

  // 🎭 FULLSCREEN THEATER MODE: Opens the photo large in a dark modal dialog
  function openViewer(source: HTMLElement = viewport) {
    if (dialog.open || expand.hidden) return;
    settle();
    opener = source;
    // Remember visitor's scroll position
    savedScroll = window.scrollY;
    // Freeze height so page doesn't jump
    root.style.height = `${root.getBoundingClientRect().height}px`;
    dialog.append(panel);
    dialog.showModal();
    document.documentElement.classList.add('modal-open');
    viewport.removeAttribute('role');
    viewport.removeAttribute('tabIndex');
    viewport.removeAttribute('aria-label');
    viewport.removeAttribute('aria-haspopup');
    // Request full-width high-definition image
    image.sizes = '100vw';
    close.focus({ preventScroll: true });
    requestAnimationFrame(keepThumbnailVisible);
  }

  // Wire up fullscreen triggers
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

  // 🚪 EXIT THEATER MODE: Restores everything back to normal on the page
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
    // Snap back to where visitor was
    window.scrollTo({ top: savedScroll, behavior: 'instant' });
    opener?.focus({ preventScroll: true });
    keepThumbnailVisible();
  });

  // 🔒 ACCESSIBILITY FOCUS TRAP:
  // When theater modal is open, pressing Tab wraps focus around inside the modal
  // so keyboard navigation doesn't accidentally wander off behind the dark screen!
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

  // 📱 MOBILE TOUCH SWIPES:
  // Detects swiping left or right with your finger on a smartphone
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
      // If finger moved sideways more than 45 pixels, trigger next or previous slide!
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

  // 📐 RESIZE WATCHER: If window size changes, keep thumbnail centered
  new ResizeObserver(() => {
    settle();
    keepThumbnailVisible();
  }).observe(viewport);

  reduced.addEventListener('change', settle);

  // 🏁 INITIAL START: Load the very first photo and get slide #2 ready in the background
  void image
    .decode()
    .then(() => {
      if (revision !== 0 || current !== 0) return;
      preview?.remove();
      preload(1);
    })
    .catch(() => {
      if (revision !== 0 || current !== 0) return;
      preview?.remove();
      showError(0);
    });
}

