import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { setupPortfolio } from '../src/scripts/photography-portfolio.ts';
import { portfolioPhotos, validatePortfolio } from '../src/data/photography-portfolio.ts';

class Element {
  listeners = {};
  dataset = {};
  hidden = false;
  attributes = {};
  children = {};
  childNodes = [];
  style = {
    cssText: '',
    setProperty(name, value) {
      this[name] = value;
    },
    removeProperty(name) {
      delete this[name];
    },
  };
  classNames = new Set();
  classList = {
    add: (...names) => names.forEach((name) => this.classNames.add(name)),
    remove: (...names) => names.forEach((name) => this.classNames.delete(name)),
    contains: (name) => this.classNames.has(name),
  };
  constructor(tagName = 'DIV') {
    this.tagName = tagName.toUpperCase();
  }
  addEventListener(type, handler) {
    (this.listeners[type] ||= []).push(handler);
  }
  fire(type, fields = {}) {
    const event = {
      target: this,
      button: 0,
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 0,
      clientY: 0,
      timeStamp: 0,
      preventDefault() {
        this.prevented = true;
      },
      ...fields,
    };
    this.listeners[type]?.forEach((handler) => handler(event));
    return event;
  }
  querySelectorAll() {
    return Object.values(this.children);
  }
  replaceChildren(...nodes) {
    this.childNodes = nodes;
    nodes.forEach((node) => {
      node.parentElement = this;
    });
  }
  get childElementCount() {
    return this.childNodes.length;
  }
  contains(target) {
    return (
      this === target || this.childNodes.some((child) => child === target || child.contains(target))
    );
  }
  getAttribute(name) {
    return this.attributes[name] ?? null;
  }
  hasAttribute(name) {
    return Object.hasOwn(this.attributes, name);
  }
  close() {
    this.open = false;
    this.fire('close');
  }
  querySelector(selector) {
    return this.children[selector];
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  toggleAttribute(name, on) {
    if (on) this.setAttribute(name, '');
    else this.removeAttribute(name);
  }
  focus() {
    globalThis.document.activeElement = this;
  }
  click() {
    this.fire('click');
  }
  closest(selector) {
    return selector === 'button' && this.tagName === 'BUTTON' ? this : null;
  }
  setPointerCapture(pointerId) {
    this.capturedPointer = pointerId;
  }
  cloneNode() {
    return Object.assign(new Element(this.tagName), this, {
      attributes: { ...this.attributes },
      children: { ...this.children },
      childNodes: [],
      dataset: { ...this.dataset },
      listeners: {},
      style: { ...this.style },
    });
  }
  replaceWith(next) {
    this.replacement = next;
  }
  getBoundingClientRect() {
    const width = this.layoutWidth ?? 980;
    return { left: 10, top: 10, right: 10 + width, bottom: 790, width, height: 780 };
  }
  getClientRects() {
    return [this.getBoundingClientRect()];
  }
}

function fixture(length) {
  const root = new Element();
  const dialog = new Element();
  dialog.showModal = () => {
    dialog.open = true;
  };
  dialog.close = () => {
    dialog.open = false;
    dialog.fire('close');
  };
  root.children['[data-portfolio-dialog]'] = dialog;
  const grid = new Element();
  grid.layoutWidth = 980;
  root.children['[data-portfolio-grid]'] = grid;
  for (const name of ['more', 'status']) root.children[`[data-portfolio-${name}]`] = new Element();
  for (const name of [
    'close',
    'prev',
    'next',
    'retry',
    'stage',
    'image-stage',
    'track',
    'pagination',
    'dots',
    'count',
    'project',
    'feedback',
  ])
    dialog.children[`[data-portfolio-${name}]`] = new Element();
  const photos = Array.from({ length }, (_, index) => {
    const photo = new Element();
    photo.offsetTop = index;
    photo.href = `/photography/project-${index}/`;
    photo.dataset = {
      full: `/full-${index}.jpeg`,
      srcset: `/large-${index}.webp 1920w`,
      projectUrl: `/photography/project-${index}/`,
    };
    photo.children.img = Object.assign(new Element(), {
      src: `/thumb-${index}.jpeg`,
      alt: `Photograph ${index}`,
      attributes: { width: '1600', height: '1000' },
      width: 1600,
      height: 1000,
    });
    return photo;
  });
  root.querySelectorAll = () => photos;
  const loaded = [];
  globalThis.Image = class extends Element {
    constructor() {
      super();
      loaded.push(this);
    }
    decode() {
      return Promise.resolve();
    }
  };
  globalThis.document = {
    body: new Element(),
    createElement: (tagName) => new Element(tagName),
    documentElement: { classList: { add() {}, remove() {} } },
    activeElement: null,
  };
  globalThis.window = {
    innerWidth: 1024,
    scrollY: 240,
    matchMedia: () => ({ matches: Boolean(globalThis.window.reduceMotion) }),
    listeners: {},
    addEventListener(type, handler) {
      (this.listeners[type] ||= []).push(handler);
    },
    scrollTo(options) {
      this.lastScroll = options;
    },
  };
  globalThis.getComputedStyle = () => ({
    getPropertyValue(name) {
      if (name === '--photo-gap') return '6px';
      return grid.layoutWidth < 900 ? '260px' : '320px';
    },
  });
  setupPortfolio(root);
  return {
    root,
    photos,
    dialog,
    loaded,
    window: globalThis.window,
    more: root.children['[data-portfolio-more]'],
    get: (name) => dialog.children[`[data-portfolio-${name}]`],
  };
}

test('curated photos are unique, dimensioned images with optional published project links', () => {
  const manifest = JSON.parse(fs.readFileSync('src/data/r2-images.json', 'utf8'));
  assert.ok(portfolioPhotos.length > 0);
  assert.equal(new Set(portfolioPhotos.map((photo) => photo.src)).size, portfolioPhotos.length);
  for (const photo of portfolioPhotos) {
    assert.ok(photo.alt.trim().length > 0);
    assert.equal(photo.width, manifest[photo.src].width);
    assert.equal(photo.height, manifest[photo.src].height);
    if (photo.projectSlug) {
      const project = fs.readFileSync(`src/content/photography/${photo.projectSlug}.md`, 'utf8');
      assert.ok(project.includes(photo.src));
      assert.match(project, /"draft": false/);
    }
  }
});

test('36 and 48 photo fixtures reveal 24 then 12, focus the first new photo and finish', () => {
  for (const total of [36, 48]) {
    const { photos, more } = fixture(total);
    assert.equal(photos.filter((photo) => !photo.hidden).length, 24);
    assert.equal(more.hidden, false);
    for (let shown = 24; shown < total; shown += 12) {
      more.fire('click');
      assert.equal(photos.filter((photo) => !photo.hidden).length, Math.min(shown + 12, total));
      assert.equal(document.activeElement, photos[shown]);
    }
    assert.equal(more.hidden, true);
  }
});

test('grid replans from intrinsic dimensions on resize and orientation change', () => {
  const { photos, root, window } = fixture(36);
  const grid = root.children['[data-portfolio-grid]'];
  const originalWidth = photos[0].style['--row-width'];
  photos[0].children.img.width = 800;
  photos[0].children.img.height = 1200;

  grid.layoutWidth = 350;
  window.listeners.resize.forEach((listener) => listener());
  assert.notEqual(photos[0].style['--row-width'], originalWidth);
  assert.ok(Math.abs(parseFloat(photos[0].style['--row-height']) - 218.75) < 1e-9);

  grid.layoutWidth = 1248;
  window.listeners.orientationchange.forEach((listener) => listener());
  assert.ok(Math.abs(parseFloat(photos[0].style['--row-height']) - 257.5) < 1e-9);
});

test('an oversized DOM fixture cannot reveal beyond the 72-photo ceiling', () => {
  const { photos, more } = fixture(84);
  for (let batch = 0; batch < 4; batch++) more.fire('click');
  assert.equal(photos.filter((photo) => !photo.hidden).length, 72);
  assert.equal(more.hidden, true);
});

test('viewer clamps at the ends, preloads valid neighbors, and returns focus and scroll', async () => {
  const { photos, more, dialog, get, loaded } = fixture(48);
  photos[0].fire('click');
  assert.equal(dialog.open, true);
  assert.equal(get('count').textContent, 'Photo 1 of 24');
  assert.deepEqual(
    loaded.map((image) => image.src),
    ['/full-0.jpeg', '/full-1.jpeg'],
  );
  get('prev').fire('click');
  assert.equal(get('count').textContent, 'Photo 1 of 24');
  assert.equal(get('prev').hidden, true);
  get('next').fire('click');
  assert.equal(get('count').textContent, 'Photo 2 of 24');
  assert.equal(get('project').href, photos[1].href);
  dialog.fire('keydown', { key: 'ArrowRight' });
  assert.equal(get('count').textContent, 'Photo 3 of 24');
  get('close').fire('click');
  assert.equal(document.activeElement, photos[0]);
  assert.deepEqual(window.lastScroll, { top: 240, behavior: 'instant' });
  more.fire('click');
  photos[35].fire('click');
  assert.equal(get('count').textContent, 'Photo 36 of 36');
  assert.equal(get('next').hidden, true);
  get('next').fire('click');
  assert.equal(get('count').textContent, 'Photo 36 of 36');
  assert.equal(photos[0].fire('click', { metaKey: true }).prevented, undefined);
  await Promise.resolve();
});

test('horizontal touch swipe advances; vertical gesture does not; backdrop closes', () => {
  const { photos, dialog, get } = fixture(8);
  photos[0].fire('click');
  const stage = get('image-stage');
  stage.fire('pointerdown', { pointerType: 'touch', clientX: 200, clientY: 100, timeStamp: 0 });
  stage.fire('pointermove', { pointerType: 'touch', clientX: 145, clientY: 110, timeStamp: 80 });
  assert.notEqual(get('track').style.transform, 'translate3d(-980px, 0, 0)');
  stage.fire('pointerup', { pointerType: 'touch', clientX: 110, clientY: 110, timeStamp: 100 });
  assert.equal(get('count').textContent, 'Photo 2 of 8');
  assert.equal(get('track').style.transitionDuration, '280ms');
  stage.fire('pointerdown', { pointerType: 'touch', clientX: 200, clientY: 100, timeStamp: 200 });
  stage.fire('pointermove', { pointerType: 'touch', clientX: 195, clientY: 150, timeStamp: 220 });
  stage.fire('pointerup', { pointerType: 'touch', clientX: 190, clientY: 250, timeStamp: 240 });
  assert.equal(get('count').textContent, 'Photo 2 of 8');
  dialog.fire('click', { clientX: 0, clientY: 0 });
  assert.equal(dialog.open, false);
});

test('fast short swipes advance and tappable dots stay inside a five-photo window', () => {
  const component = fs.readFileSync('src/components/PhotographyPortfolio.astro', 'utf8');
  assert.match(component, /class="portfolio-pagination-dots" data-portfolio-dots>/);

  const { photos, get, window: taskWindow } = fixture(12);
  photos[0].fire('click');
  const stage = get('image-stage');
  stage.fire('pointerdown', { clientX: 200, clientY: 100, timeStamp: 0 });
  stage.fire('pointermove', { clientX: 170, clientY: 101, timeStamp: 40 });
  stage.fire('pointerup', { clientX: 168, clientY: 101, timeStamp: 42 });
  assert.equal(get('count').textContent, 'Photo 2 of 12');

  const imageStage = get('image-stage');
  const stageBounds = imageStage.getBoundingClientRect();
  imageStage.getBoundingClientRect = () => ({ ...stageBounds, width: 374 });
  taskWindow.listeners.resize.forEach((listener) => listener());
  assert.equal(get('track').style.transform, 'translate3d(-374px, 0, 0)');
  assert.equal(get('track').style.transitionDuration, '0ms');

  const strip = get('pagination');
  const dots = get('dots').childNodes;
  assert.equal(dots.length, 12);
  assert.equal(strip.style.width, '120px');
  assert.equal(strip.getAttribute('aria-label'), 'Photo 2 of 12');
  const activeDot = dots.find((dot) => dot.getAttribute('aria-current') === 'true');
  assert.equal(activeDot.tagName, 'BUTTON');
  assert.equal(activeDot.dataset.index, '1');
  assert.equal(activeDot.getAttribute('aria-label'), 'Photo 2 of 12');
  assert.equal(activeDot.tabIndex, 0);
  assert.equal(dots[5].tabIndex, -1);
  assert.equal(dots[5].style['--dot-scale'], '0');
  dots.find((dot) => dot.dataset.index === '4').fire('click');
  assert.equal(get('count').textContent, 'Photo 5 of 12');
  assert.equal(dots.find((dot) => dot.getAttribute('aria-current') === 'true').dataset.index, '4');
  taskWindow.reduceMotion = true;
  get('next').fire('click');
  assert.equal(get('track').style.transitionDuration, '0ms');
});

test('dot window pins near the ends and tapers only toward hidden photos', () => {
  const { photos, get } = fixture(7);
  photos[0].fire('click');
  const dots = get('dots').childNodes;
  assert.equal(dots[1].style['--dot-scale'], '1');
  assert.equal(dots[4].style['--dot-scale'], '0.5');
  for (let index = 0; index < 6; index++) get('next').fire('click');
  assert.equal(get('pagination').getAttribute('aria-label'), 'Photo 7 of 7');
  assert.equal(dots[0].style['--dot-scale'], '0');
  assert.equal(dots[2].style['--dot-scale'], '0.5');
  assert.equal(dots[3].style['--dot-scale'], '0.75');
  assert.equal(dots[5].style['--dot-scale'], '1');
  assert.equal(dots[6].getAttribute('aria-current'), 'true');
});

test('long press captures and scrubs; short press movement cancels it', async () => {
  const { photos, get } = fixture(8);
  photos[0].fire('click');
  const strip = get('pagination');
  strip.fire('pointerdown', {
    pointerId: 7,
    clientX: 32,
    clientY: 20,
  });
  await new Promise((resolve) => setTimeout(resolve, 260));
  assert.equal(strip.classList.contains('is-scrubbing'), true);
  assert.equal(strip.capturedPointer, 7);

  strip.fire('pointermove', { pointerId: 7, clientX: 60, clientY: 20 });
  assert.equal(get('count').textContent, 'Photo 3 of 8');
  assert.equal(get('track').style.transitionProperty, 'opacity');
  await new Promise((resolve) => setTimeout(resolve, 130));
  assert.equal(get('track').style.transform, 'translate3d(-1960px, 0, 0)');
  strip.fire('pointerup', { pointerId: 7 });
  assert.equal(strip.classList.contains('is-scrubbing'), false);

  strip.fire('pointerdown', { pointerId: 8, clientX: 40, clientY: 20 });
  strip.fire('pointermove', { pointerId: 8, clientX: 49, clientY: 20 });
  await new Promise((resolve) => setTimeout(resolve, 260));
  assert.equal(strip.classList.contains('is-scrubbing'), false);
  strip.fire('pointerup', { pointerId: 8 });
});

test('swipes resist outward movement at both ends and spring back without wrapping', () => {
  const { photos, get } = fixture(3);
  photos[0].fire('click');
  const stage = get('image-stage');
  stage.fire('pointerdown', { clientX: 100, clientY: 100, timeStamp: 0 });
  stage.fire('pointermove', { clientX: 140, clientY: 100, timeStamp: 100 });
  assert.equal(get('track').style.transform, 'translate3d(10px, 0, 0)');
  stage.fire('pointerup', { clientX: 140, clientY: 100, timeStamp: 100 });
  assert.equal(get('count').textContent, 'Photo 1 of 3');
  assert.equal(get('track').style.transform, 'translate3d(0px, 0, 0)');
  assert.equal(get('track').style.transitionDuration, '280ms');

  get('close').fire('click');
  photos[2].fire('click');
  stage.fire('pointerdown', { clientX: 200, clientY: 100, timeStamp: 200 });
  stage.fire('pointermove', { clientX: 160, clientY: 100, timeStamp: 300 });
  assert.equal(get('track').style.transform, 'translate3d(-1970px, 0, 0)');
  stage.fire('pointerup', { clientX: 160, clientY: 100, timeStamp: 300 });
  assert.equal(get('count').textContent, 'Photo 3 of 3');
});

test('build validation rejects invalid dimensions, missing exports, blank alt, unpublished links and excess photos', () => {
  const photo = portfolioPhotos[0];
  const published = new Set(portfolioPhotos.map((photo) => photo.projectSlug));
  const dimensions = () => ({ width: photo.width, height: photo.height });
  assert.doesNotThrow(() => validatePortfolio([photo], published, dimensions));
  for (const width of [0, -1, NaN, Infinity, photo.width + 1]) {
    assert.throws(
      () => validatePortfolio([{ ...photo, width }], published, dimensions),
      /dimensions/,
    );
  }
  assert.throws(
    () => validatePortfolio([{ ...photo, height: 0 }], published, dimensions),
    /dimensions/,
  );
  assert.throws(
    () => validatePortfolio([{ ...photo, alt: '  ' }], published, dimensions),
    /alt text/,
  );
  assert.throws(
    () => validatePortfolio([{ ...photo, projectSlug: 'unpublished' }], published, dimensions),
    /not published/,
  );
  assert.throws(() => validatePortfolio([photo], published, () => undefined), /responsive exports/);
  assert.throws(() => validatePortfolio(Array(73).fill(photo), published, dimensions), /72/);
});

test('a deliberate backdrop tap still closes after a completed swipe', () => {
  const { photos, dialog, get } = fixture(8);
  photos[0].fire('click');
  const stage = get('image-stage');
  stage.fire('pointerdown', { pointerType: 'touch', clientX: 200, clientY: 100, timeStamp: 0 });
  stage.fire('pointermove', { pointerType: 'touch', clientX: 150, clientY: 100, timeStamp: 60 });
  stage.fire('pointerup', { pointerType: 'touch', clientX: 100, clientY: 100, timeStamp: 100 });
  dialog.fire('pointerdown', { pointerType: 'touch', clientX: 0, clientY: 0 });
  dialog.fire('click', { clientX: 0, clientY: 0 });
  assert.equal(dialog.open, false);
});
