import { expect, test } from '@playwright/test';

const article = '/post-production/20261009-astbmb-scenebreakdown/';
const photoProject = '/photography/20260801-late-night-drive-short-film-day-01/';

async function openImage(page, route, selector, index = 0) {
  await page.goto(route);
  const opener = page.locator(selector).nth(index);
  await opener.click();
  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  const image = dialog.locator(`.portfolio-slide[data-photo-index="${index}"] img`);
  await expect(image).toBeVisible();
  await expect(dialog.locator('[data-portfolio-feedback]')).toHaveText('', { timeout: 30_000 });
  return { dialog, image };
}

function sourceWidth(src) {
  return Number(new URL(src).pathname.match(/-(\d+)\.(?:webp|jpe?g)$/)?.[1] || 0);
}

async function zoomTransform(image) {
  return image.evaluate((element) => {
    const transform = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return { scale: transform.a, x: transform.m41, y: transform.m42 };
  });
}

test('desktop click zoom loads the largest responsive photo and remains keyboard operable', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop pointer interaction');

  const { dialog, image } = await openImage(page, photoProject, '[data-gallery-trigger]', 1);
  const sources = await image.evaluate((element) => ({
    srcset: element.srcset,
    current: element.currentSrc,
  }));
  const maxWidth = Math.max(
    ...Array.from(sources.srcset.matchAll(/(\d+)w/g), ([, width]) => Number(width)),
  );
  const initialWidth = sourceWidth(sources.current);
  expect(maxWidth).toBeGreaterThanOrEqual(1920);
  expect(initialWidth).toBeLessThan(maxWidth);

  const imageBounds = await image.boundingBox();
  if (!imageBounds) throw new Error('Expanded image is not visible');
  await image.click({
    position: { x: imageBounds.width * 0.75, y: imageBounds.height / 2 },
  });
  await expect(image).toHaveAttribute('data-zoomed', '');
  await expect
    .poll(() =>
      image.evaluate((element) =>
        Number(
          element.currentSrc
            ? new URL(element.currentSrc).pathname.match(/-(\d+)\.(?:webp|jpe?g)$/)?.[1] || 0
            : 0,
        ),
      ),
    )
    .toBe(maxWidth);
  await expect.poll(async () => (await zoomTransform(image)).scale).toBeCloseTo(2, 1);
  await expect(image).toHaveCSS('cursor', 'zoom-out');

  await image.focus();
  await page.keyboard.press('Enter');
  await expect(image).not.toHaveAttribute('data-zoomed', '');
  await page.keyboard.press('Space');
  await expect(image).toHaveAttribute('data-zoomed', '');
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    '2',
  );
  await expect(dialog.locator('.portfolio-slide[data-photo-index="2"] img')).not.toHaveAttribute(
    'data-zoomed',
    '',
  );
});

test('mobile double-tap and pinch zoom pan without stealing fitted-level swipes', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'Touch interaction');

  const { dialog, image } = await openImage(page, article, '[data-article-image-trigger]');
  const stage = dialog.locator('[data-portfolio-image-stage]');
  const bounds = await stage.boundingBox();
  if (!bounds) throw new Error('Image stage is not visible');
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const sources = await image.evaluate((element) => ({
    srcset: element.srcset,
    current: element.currentSrc,
  }));
  const maxWidth = Math.max(
    ...Array.from(sources.srcset.matchAll(/(\d+)w/g), ([, width]) => Number(width)),
  );
  expect(sourceWidth(sources.current)).toBeLessThan(maxWidth);

  await page.touchscreen.tap(centerX, centerY);
  await page.touchscreen.tap(centerX, centerY);
  await expect(image).toHaveAttribute('data-zoomed', '');
  await expect.poll(async () => (await zoomTransform(image)).scale).toBeCloseTo(2, 1);
  await expect
    .poll(() =>
      image.evaluate((element) =>
        Number(
          element.currentSrc
            ? new URL(element.currentSrc).pathname.match(/-(\d+)\.(?:webp|jpe?g)$/)?.[1] || 0
            : 0,
        ),
      ),
    )
    .toBe(maxWidth);
  await page.touchscreen.tap(centerX, centerY);
  await page.touchscreen.tap(centerX, centerY);
  await expect(image).not.toHaveAttribute('data-zoomed', '');

  await stage.evaluate(
    (element, point) => {
      Object.defineProperty(element, 'setPointerCapture', { value: () => {}, configurable: true });
      const dispatch = (type, pointerId, x, y, isPrimary) =>
        element.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId,
            pointerType: 'touch',
            isPrimary,
            button: 0,
            clientX: x,
            clientY: y,
          }),
        );
      dispatch('pointerdown', 81, point.x - 40, point.y, true);
      const track = element.querySelector('[data-portfolio-track]');
      const fittedPosition = track.style.transform;
      dispatch('pointermove', 81, point.x - 80, point.y, true);
      if (track.style.transform === fittedPosition) {
        throw new Error('The initial one-finger swipe did not move the track');
      }
      dispatch('pointerdown', 82, point.x + 40, point.y, false);
      if (track.style.transform !== fittedPosition) {
        throw new Error('Beginning a pinch did not restore the current slide position');
      }
      dispatch('pointermove', 81, point.x - 160, point.y, true);
      dispatch('pointermove', 82, point.x + 80, point.y, false);
    },
    { x: centerX, y: centerY },
  );

  await expect(image).toHaveAttribute('data-zoomed', '');
  await expect.poll(async () => (await zoomTransform(image)).scale).toBeCloseTo(2, 1);
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    '0',
  );

  const positionBeforePan = await zoomTransform(image);
  await stage.evaluate(
    (element, point) => {
      const dispatch = (type, pointerId, x, y, isPrimary) =>
        element.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId,
            pointerType: 'touch',
            isPrimary,
            button: 0,
            clientX: x,
            clientY: y,
          }),
        );
      dispatch('pointerup', 82, point.x + 80, point.y, false);
      dispatch('pointermove', 81, point.x - 105, point.y, true);
      dispatch('pointerup', 81, point.x - 105, point.y, true);
    },
    { x: centerX, y: centerY },
  );

  await expect
    .poll(async () => {
      const position = await zoomTransform(image);
      return Math.hypot(position.x - positionBeforePan.x, position.y - positionBeforePan.y);
    })
    .toBeGreaterThan(8);
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    '0',
  );

  await page.touchscreen.tap(centerX, centerY);
  await page.touchscreen.tap(centerX, centerY);
  await expect(image).not.toHaveAttribute('data-zoomed', '');

  await stage.evaluate(
    (element, point) => {
      Object.defineProperty(element, 'setPointerCapture', { value: () => {}, configurable: true });
      const dispatch = (type, x) =>
        element.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 83,
            pointerType: 'touch',
            isPrimary: true,
            button: 0,
            clientX: x,
            clientY: point.y,
          }),
        );
      dispatch('pointerdown', point.x + element.clientWidth * 0.35);
      dispatch('pointermove', point.x - element.clientWidth * 0.1);
      dispatch('pointerup', point.x - element.clientWidth * 0.1);
    },
    { x: centerX, y: centerY },
  );

  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    '1',
  );
  await expect(dialog.locator('.portfolio-slide[data-photo-index="1"] img')).not.toHaveAttribute(
    'data-zoomed',
    '',
  );
});
