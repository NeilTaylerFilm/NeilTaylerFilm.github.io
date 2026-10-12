import { expect, test } from '@playwright/test';

const haGiang = '/photography/20260526-ha-giang-loop/';
const lateNight = '/photography/20260809-late-night-drive-bts/';

test.beforeEach(({}, testInfo) => {
  test.skip(
    testInfo.project.name === 'chromium-iphone-14',
    'Run on desktop Chromium and iPhone WebKit',
  );
});

async function openGalleryPhoto(page, route, photoIndex, expectedCount) {
  await page.goto(route);
  const triggers = page.locator('[data-gallery-trigger]');
  await expect(triggers).toHaveCount(expectedCount);
  const opener = triggers.nth(photoIndex);
  const fullSource = await opener.getAttribute('data-full');
  expect(fullSource).toBeTruthy();
  await opener.click();

  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  const image = dialog.locator(`.portfolio-slide[data-photo-index="${photoIndex}"] img`);
  await expect(image).toBeVisible();
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    String(photoIndex),
  );
  return { dialog, image, opener };
}

async function activeIndex(dialog) {
  return Number(
    await dialog.locator('.portfolio-dot[aria-current="true"]').getAttribute('data-index'),
  );
}

async function visibleDotState(dialog) {
  return dialog.locator('.portfolio-dot:not([aria-hidden="true"])').evaluateAll((dots) =>
    dots.map((dot) => ({
      index: Number(dot.dataset.index),
      scale: Number(dot.style.getPropertyValue('--dot-scale')),
    })),
  );
}

async function swipeImageStage(dialog, direction) {
  await dialog.locator('[data-portfolio-image-stage]').evaluate((stage, swipeDirection) => {
    Object.defineProperty(stage, 'setPointerCapture', {
      value: () => {},
      configurable: true,
    });
    const bounds = stage.getBoundingClientRect();
    const start = bounds.left + bounds.width * 0.75;
    const end = start - swipeDirection * bounds.width * 0.4;
    const y = bounds.top + bounds.height / 2;
    const dispatch = (type, x) =>
      stage.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 43,
          pointerType: 'touch',
          isPrimary: true,
          button: 0,
          clientX: x,
          clientY: y,
        }),
      );
    dispatch('pointerdown', start);
    dispatch('pointermove', end);
    dispatch('pointerup', end);
  }, direction);
}

async function scrubDots(dialog, distance = 28) {
  const pagination = dialog.locator('[data-portfolio-pagination]');
  return pagination.evaluate(async (element, scrubDistance) => {
    Object.defineProperty(element, 'setPointerCapture', {
      value: () => {},
      configurable: true,
    });
    const bounds = element.getBoundingClientRect();
    const startX = bounds.left + 2;
    const y = bounds.top + 2;
    const dispatch = (type, x) =>
      element.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 71,
          pointerType: 'touch',
          isPrimary: true,
          button: 0,
          clientX: x,
          clientY: y,
        }),
      );
    dispatch('pointerdown', startX);
    await new Promise((resolve) => setTimeout(resolve, 280));
    let frameDuration;
    element.addEventListener(
      'pointermove',
      () => {
        const started = performance.now();
        requestAnimationFrame(() => {
          frameDuration = performance.now() - started;
        });
      },
      { capture: true, once: true },
    );
    dispatch('pointermove', startX + scrubDistance);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const result = {
      scrubbing: element.classList.contains('is-scrubbing'),
      frameDuration,
      active: Number(
        element.closest('dialog').querySelector('.portfolio-dot[aria-current="true"]').dataset
          .index,
      ),
    };
    dispatch('pointerup', startX + scrubDistance);
    return result;
  }, distance);
}

async function setGalleryCaptions(page, firstCaption = '', secondCaption = '') {
  await page.locator('[data-gallery-trigger]').evaluateAll(
    (triggers, captions) => {
      for (const trigger of triggers) delete trigger.dataset.caption;
      if (captions[0]) triggers[0].dataset.caption = captions[0];
      if (captions[1]) triggers[1].dataset.caption = captions[1];
    },
    [firstCaption, secondCaption],
  );
}

test('40-photo gallery opens the selected image and uses a five-dot tapered window', async ({
  page,
}) => {
  const { dialog } = await openGalleryPhoto(page, haGiang, 0, 40);
  await expect(dialog.locator('.portfolio-dot')).toHaveCount(40);
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'aria-label',
    'Photo 1 of 40',
  );
  expect(await visibleDotState(dialog)).toHaveLength(5);
  expect(await dialog.locator('.portfolio-dot[aria-hidden="true"]').count()).toBe(35);

  let dots = await visibleDotState(dialog);
  expect(dots[0].scale).toBe(1.3);
  expect(dots[1].scale).toBe(1);
  expect(dots[3].scale).toBe(0.75);
  expect(dots[4].scale).toBe(0.5);

  for (let index = 0; index < 19; index++) await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    '19',
  );
  dots = await visibleDotState(dialog);
  expect(dots.map((dot) => dot.scale)).toEqual([0.5, 0.75, 1, 1.3, 0.5]);

  for (let index = 19; index < 39; index++) await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'aria-label',
    'Photo 40 of 40',
  );
  dots = await visibleDotState(dialog);
  expect(dots.map((dot) => dot.scale)).toEqual([0.5, 0.75, 1, 1, 1.3]);
  expect(await visibleDotState(dialog)).toHaveLength(5);
});

test('gallery keyboard navigation clamps, hides endpoint arrows, and restores focus', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Arrow controls are desktop-only');
  const { dialog, opener } = await openGalleryPhoto(page, haGiang, 0, 40);
  const previous = dialog.locator('[data-portfolio-prev]');
  const next = dialog.locator('[data-portfolio-next]');
  await expect(previous).toBeHidden();
  await expect(next).toBeVisible();

  await page.keyboard.press('ArrowLeft');
  expect(await activeIndex(dialog)).toBe(0);
  await page.keyboard.press('ArrowRight');
  expect(await activeIndex(dialog)).toBe(1);
  await next.click();
  expect(await activeIndex(dialog)).toBe(2);

  for (let index = 2; index < 39; index++) await page.keyboard.press('ArrowRight');
  await expect(next).toBeHidden();
  await expect(previous).toBeVisible();
  await page.keyboard.press('ArrowRight');
  expect(await activeIndex(dialog)).toBe(39);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(opener).toBeFocused();
});

test('gallery dismissal locks and restores scrolling and accepts outside clicks', async ({
  page,
}) => {
  await page.goto(haGiang);
  const opener = page.locator('[data-gallery-trigger]').nth(20);
  await opener.scrollIntoViewIfNeeded();
  const savedScroll = await page.evaluate(() => window.scrollY);
  await opener.click();
  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(page.locator('html')).toHaveClass(/modal-open/);
  await expect(page.locator('body')).toHaveCSS('position', 'fixed');
  expect(await page.locator('body').evaluate((body) => body.style.top)).toBe(`-${savedScroll}px`);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  const stage = dialog.locator('[data-portfolio-stage]');
  await stage.evaluate((element) => {
    element.querySelector('.portfolio-media').style.pointerEvents = 'none';
  });
  await stage.click({ position: { x: 2, y: 2 } });
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(opener).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(savedScroll);
});

test('iPhone WebKit swipes at both collection endpoints and scrubs the dot window', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-iphone-14', 'Touch interaction test');
  let { dialog, opener } = await openGalleryPhoto(page, haGiang, 0, 40);
  await swipeImageStage(dialog, 1);
  expect(await activeIndex(dialog)).toBe(1);
  const scrub = await scrubDots(dialog);
  expect(scrub.scrubbing).toBe(true);
  expect(scrub.active).toBeGreaterThan(1);
  expect(scrub.frameDuration).toBeGreaterThanOrEqual(0);
  await dialog.locator('[data-portfolio-close]').click();
  await expect(opener).toBeFocused();

  ({ dialog, opener } = await openGalleryPhoto(page, haGiang, 39, 40));
  await swipeImageStage(dialog, 1);
  expect(await activeIndex(dialog)).toBe(39);
  await swipeImageStage(dialog, -1);
  expect(await activeIndex(dialog)).toBe(38);
  await dialog.locator('[data-portfolio-stage]').evaluate((element) => {
    element.querySelector('.portfolio-media').style.pointerEvents = 'none';
  });
  await dialog.locator('[data-portfolio-stage]').tap({ position: { x: 2, y: 2 } });
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(opener).toBeFocused();
});

test('gallery image failures keep an accessible open-original fallback and can retry', async ({
  page,
}, testInfo) => {
  await page.goto(haGiang);
  const trigger = page.locator('[data-gallery-trigger]').first();
  await trigger.locator('img').evaluate((image) => image.decode());
  const imageUrl = `${await trigger.getAttribute('data-full')}?viewer-retry=${Date.now()}`;
  await trigger.evaluate((anchor, href) => {
    anchor.href = href;
    anchor.dataset.full = href;
    delete anchor.dataset.srcset;
  }, imageUrl);

  let attempts = 0;
  await page.route(imageUrl, async (route) => {
    attempts++;
    if (attempts === 1) {
      await route.fulfill({
        status: 404,
        body: 'missing',
        headers: { 'cache-control': 'no-store' },
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aTVsAAAAASUVORK5CYII=',
        'base64',
      ),
    });
  });

  await trigger.click();
  const dialog = page.locator('[data-portfolio-dialog]');
  const feedback = dialog.locator('[data-portfolio-feedback]');
  const retry = dialog.locator('[data-portfolio-retry]');
  const openLink = dialog.locator('[data-portfolio-open]');
  const close = dialog.locator('[data-portfolio-close]');
  await expect(feedback).toHaveText('This photograph could not load. Please try again.');
  await expect(retry).toBeVisible();
  await expect(openLink).toBeVisible();
  await expect(openLink).toHaveAttribute('href', imageUrl);
  await expect(openLink).toHaveAttribute('target', '_blank');
  await expect(openLink).toHaveAttribute('rel', 'noopener noreferrer');

  if (testInfo.project.name === 'desktop-chromium') {
    await retry.focus();
    await page.keyboard.press('Tab');
    await expect(openLink).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
  }

  await retry.click();
  await expect.poll(() => attempts).toBe(2);
  await expect(feedback).toHaveText('');
  await expect(openLink).toBeHidden();
});

test('desktop Space opens gallery photos without scrolling or repeating', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Space-key behavior is desktop-only');
  await page.goto(haGiang);
  const triggers = page.locator('[data-gallery-trigger]');
  const opener = triggers.first();
  const second = triggers.nth(1);
  await opener.scrollIntoViewIfNeeded();
  await opener.evaluate((anchor) => anchor.focus({ preventScroll: true }));
  const savedScroll = await page.evaluate(() => window.scrollY);
  await page.keyboard.down('Space');
  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  expect(
    Math.abs(
      Number.parseFloat(await page.locator('body').evaluate((body) => body.style.top)) +
        savedScroll,
    ),
  ).toBeLessThan(1);
  await second.evaluate((anchor) =>
    anchor.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', repeat: true, bubbles: true, cancelable: true }),
    ),
  );
  expect(await activeIndex(dialog)).toBe(0);
  await page.keyboard.up('Space');
  await dialog.locator('[data-portfolio-close]').click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(savedScroll);
});

test('202-photo gallery keeps the complete sequence and measures scrub-to-frame time', async ({
  page,
}, testInfo) => {
  const { dialog, opener } = await openGalleryPhoto(page, lateNight, 100, 202);
  await expect(dialog.locator('.portfolio-dot')).toHaveCount(202);
  expect(await activeIndex(dialog)).toBe(100);

  const measurements = [];
  for (let index = 0; index < 5; index++) {
    const result = await scrubDots(dialog);
    expect(result.scrubbing).toBe(true);
    expect(result.active).toBe(102 + index * 2);
    expect(result.frameDuration).toBeGreaterThanOrEqual(0);
    measurements.push(result.frameDuration);
  }
  const ordered = [...measurements].sort((a, b) => a - b);
  const median = ordered[Math.floor(ordered.length / 2)];
  console.log(
    `202-photo scrub-to-next-frame (${testInfo.project.name}, development machine): samples ${measurements.map((value) => value.toFixed(2)).join(', ')} ms; median ${median.toFixed(2)} ms`,
  );
  await dialog.locator('[data-portfolio-close]').click();
  await expect(opener).toBeFocused();
});

test('captions reserve a fixed area, remain scrollable, and expose overflow accessibly', async ({
  page,
}, testInfo) => {
  await page.setViewportSize(
    testInfo.project.name === 'desktop-chromium'
      ? { width: 640, height: 900 }
      : { width: 393, height: 844 },
  );
  await page.goto(haGiang);
  const longText =
    `A long view along the mountain road, with changing light and distant ridgelines. `.repeat(4);
  const shortText = 'A quiet turn in the road.';
  const dimensions = [];
  let dialog = page.locator('[data-portfolio-dialog]');

  for (const [captionText, otherCaption] of [
    ['', shortText],
    [shortText, ''],
    [longText, ''],
  ]) {
    await setGalleryCaptions(page, captionText, otherCaption);
    const opener = page.locator('[data-gallery-trigger]').first();
    await opener.click();
    await expect(dialog).toHaveAttribute('open', '');
    const caption = dialog.locator('[data-portfolio-caption]');
    const image = dialog.locator('.portfolio-slide[data-photo-index="0"] img');
    await expect(caption).toHaveText(captionText);
    if (!captionText) {
      await expect(dialog).toHaveAttribute('data-has-captions', '');
      await expect(caption).not.toHaveAttribute('tabindex', '0');
    } else {
      await expect(dialog).toHaveAttribute('data-has-captions', '');
      const area = await caption.evaluate((element) => ({
        height: element.getBoundingClientRect().height,
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      }));
      expect(area.height).toBeCloseTo(area.fontSize * 3, 1);
    }
    if (captionText === longText) {
      await expect(caption).toHaveAttribute('tabindex', '0');
      await expect(caption).toHaveAttribute('role', 'region');
      await expect(caption).toHaveAttribute('aria-label', 'Photo caption');
      await expect
        .poll(() => caption.evaluate((element) => element.scrollHeight > element.clientHeight + 1))
        .toBe(true);
      const before = await activeIndex(dialog);
      await caption.evaluate((element) => {
        element.focus();
        element.scrollTop = 0;
      });
      if (testInfo.project.name === 'desktop-chromium') {
        await page.keyboard.press('ArrowDown');
        await expect
          .poll(() => caption.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
        expect(await activeIndex(dialog)).toBe(before);
        await caption.evaluate((element) => {
          element.scrollTop = element.scrollHeight;
        });
        const scrolledBottom = await caption.evaluate((element) => element.scrollTop);
        await page.keyboard.press('ArrowUp');
        await expect
          .poll(() => caption.evaluate((element) => element.scrollTop))
          .toBeLessThan(scrolledBottom);
        await caption.evaluate((element) => {
          element.scrollTop = 0;
        });
        await page.keyboard.press('PageDown');
        await expect
          .poll(() => caption.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
        const pageDownPosition = await caption.evaluate((element) => element.scrollTop);
        await page.keyboard.press('PageUp');
        await expect
          .poll(() => caption.evaluate((element) => element.scrollTop))
          .toBeLessThan(pageDownPosition);
      } else {
        await dialog.evaluate((element) => {
          element.addEventListener('keydown', (event) => {
            if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(event.key)) {
              window.__photoViewerVerticalKeyPrevented = event.defaultPrevented;
            }
          });
        });
        for (const key of ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp']) {
          await page.keyboard.press(key);
          expect(await page.evaluate(() => window.__photoViewerVerticalKeyPrevented)).toBe(false);
        }
      }
      expect(await activeIndex(dialog)).toBe(before);
      await caption.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      expect(await caption.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    } else {
      await expect(caption).not.toHaveAttribute('tabindex');
      await expect(caption).not.toHaveAttribute('role');
      await expect(caption).not.toHaveAttribute('aria-label');
    }
    dimensions.push(await image.boundingBox());
    await dialog.locator('[data-portfolio-close]').click();
  }

  for (const bounds of dimensions.slice(1)) {
    expect(bounds.width).toBeCloseTo(dimensions[0].width, 1);
    expect(bounds.height).toBeCloseTo(dimensions[0].height, 1);
  }

  await setGalleryCaptions(page);
  await page.locator('[data-gallery-trigger]').first().click();
  await expect(dialog).not.toHaveAttribute('data-has-captions', '');
  await expect(dialog.locator('[data-portfolio-caption]')).toBeHidden();
  await dialog.locator('[data-portfolio-close]').click();
});

test('overflowing caption is tabbable, stays inside the focus trap, and releases focus when it fits', async ({
  page,
}, testInfo) => {
  await page.setViewportSize(
    testInfo.project.name === 'desktop-chromium'
      ? { width: 640, height: 900 }
      : { width: 393, height: 844 },
  );
  await page.goto(haGiang);
  const longText =
    `A long view along the mountain road, with changing light and distant ridgelines. `.repeat(4);
  await setGalleryCaptions(page, longText, 'A short second caption.');
  const opener = page.locator('[data-gallery-trigger]').first();
  await opener.click();
  const dialog = page.locator('[data-portfolio-dialog]');
  const caption = dialog.locator('[data-portfolio-caption]');
  const close = dialog.locator('[data-portfolio-close]');
  await expect(caption).toHaveAttribute('tabindex', '0');
  const tabsToCaption = testInfo.project.name === 'desktop-chromium' ? 2 : 1;
  for (let index = 0; index < tabsToCaption; index++) await page.keyboard.press('Tab');
  await expect(caption).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    '1',
  );
  await expect(close).toBeFocused();
  await expect(caption).not.toHaveAttribute('tabindex');
  await expect(caption).not.toHaveAttribute('role', 'region');
  await expect(caption).not.toHaveAttribute('aria-label', 'Photo caption');
  expect(
    await close.evaluate(
      (button) => button.closest('dialog') === document.activeElement.closest('dialog'),
    ),
  ).toBe(true);

  await setGalleryCaptions(page, longText);
  await dialog.locator('[data-portfolio-close]').click();
  await opener.click();
  await caption.evaluate((element) => element.focus());
  await dialog.locator('.portfolio-dot:not([aria-hidden="true"])').last().focus();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
});

test('caption overflow adds and removes a tab stop as the viewport changes', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto(haGiang);
  const text =
    'A changing view along a quiet mountain road, with soft light and distant ridgelines. '.repeat(
      2,
    );
  await setGalleryCaptions(page, text);
  const opener = page.locator('[data-gallery-trigger]').first();
  await opener.click();
  const dialog = page.locator('[data-portfolio-dialog]');
  const caption = dialog.locator('[data-portfolio-caption]');
  const close = dialog.locator('[data-portfolio-close]');
  await expect(caption).not.toHaveAttribute('tabindex');

  await page.setViewportSize({ width: 220, height: 900 });
  await expect(caption).toHaveAttribute('tabindex', '0');
  await expect(caption).toHaveAttribute('role', 'region');
  await expect(caption).toHaveAttribute('aria-label', 'Photo caption');
  const tabsToCaption = testInfo.project.name === 'desktop-chromium' ? 2 : 1;
  for (let index = 0; index < tabsToCaption; index++) await page.keyboard.press('Tab');
  await expect(caption).toBeFocused();

  await page.setViewportSize({ width: 900, height: 900 });
  await expect(caption).not.toHaveAttribute('tabindex');
  await expect(caption).not.toHaveAttribute('role');
  await expect(caption).not.toHaveAttribute('aria-label');
  await expect(close).toBeFocused();

  await page.setViewportSize({ width: 220, height: 900 });
  await expect(caption).toHaveAttribute('tabindex', '0');
  await caption.evaluate((element) => element.focus());
  await page.setViewportSize({ width: 900, height: 900 });
  await expect(close).toBeFocused();
  await expect(caption).not.toHaveAttribute('tabindex');
});
