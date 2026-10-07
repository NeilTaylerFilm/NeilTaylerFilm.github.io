import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const base = process.env.PREVIEW_CHECK_URL || 'http://127.0.0.1:4323/photography/';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let heroBody;
let heroContentType;

try {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    page.on('response', async (response) => {
      if (response.url().includes('/photos/588176e9b85445d319829378ab9beff3-')) {
        heroBody = Buffer.from(await response.body());
        heroContentType = await response.headerValue('content-type');
      }
    });
    let releaseHero;
    const heroHeld = new Promise((resolve) => (releaseHero = resolve));
    await page.route('**/photos/588176e9b85445d319829378ab9beff3-*', async (route) => {
      releaseHero();
      await delay(1200);
      await route.continue();
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await heroHeld;
    await page.waitForFunction(() => document.querySelector('.photo-preview')?.naturalWidth > 0);
    assert.equal(await page.locator('[data-slide-image]').evaluate((img) => img.complete), false);
    await page.locator('[data-photo-index="0"]').click();
    assert.equal(
      await page.locator('.photo-preview').count(),
      1,
      'same-photo click removed preview',
    );
    const before = await page.locator('[data-photo-viewport]').boundingBox();
    await page.screenshot({ path: `/tmp/photo-preview-${width}.png` });
    if (width === 1440) {
      await page.locator('[data-slide-next]').click();
      await page.waitForFunction(
        () => {
          const image = document.querySelector('[data-slide-image]');
          return (
            document.querySelector('[data-slideshow]')?.dataset.index === '1' &&
            image?.naturalWidth > 0
          );
        },
        null,
        { timeout: 15000 },
      );
      await delay(1400);
      assert.equal(await page.locator('[data-slideshow]').getAttribute('data-index'), '1');
      assert.match(await page.locator('[data-slide-image]').getAttribute('src'), /9166dbc3/);
      assert.equal(await page.locator('.photo-preview').count(), 0);
    }
    await page.waitForFunction(
      () => {
        const image = document.querySelector('[data-slide-image]');
        return (
          image?.complete && image.naturalWidth > 0 && !document.querySelector('.photo-preview')
        );
      },
      null,
      { timeout: 15000 },
    );
    const after = await page.locator('[data-photo-viewport]').boundingBox();
    assert.deepEqual(after, before, `viewport shifted at ${width}px`);
    await context.close();
  }

  const failedContext = await browser.newContext({ viewport: { width: 375, height: 900 } });
  const failedPage = await failedContext.newPage();
  let failedOnce = false;
  await failedPage.route('**/photos/588176e9b85445d319829378ab9beff3-*', async (route) => {
    if (!failedOnce) {
      failedOnce = true;
      await route.abort();
    } else await route.continue();
  });
  await failedPage.goto(base, { waitUntil: 'domcontentloaded' });
  await failedPage.locator('.photo-error').waitFor({ timeout: 15000 });
  assert.equal(await failedPage.locator('.photo-preview').count(), 0);
  await failedPage.getByRole('button', { name: /retry loading/i }).click();
  await failedPage.waitForFunction(
    () => document.querySelector('[data-slide-image]')?.naturalWidth > 0,
    null,
    { timeout: 15000 },
  );
  assert.equal(await failedPage.locator('.photo-error').count(), 0);
  await failedContext.close();

  const noJsContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 900 },
  });
  const noJsPage = await noJsContext.newPage();
  assert.ok(heroBody?.length, 'delayed hero response was not captured');
  await noJsPage.route('**/photos/588176e9b85445d319829378ab9beff3-*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: heroContentType || 'image/jpeg',
      body: heroBody,
    });
  });
  await noJsPage.goto(base, { waitUntil: 'domcontentloaded' });
  await noJsPage.waitForFunction(
    () => document.querySelector('[data-slide-image]')?.naturalWidth > 0,
    null,
    { timeout: 45000 },
  );
  assert.equal(await noJsPage.locator('[data-slide-image]').count(), 1);
  await noJsPage.screenshot({ path: '/tmp/photo-preview-nojs.png' });
  await noJsContext.close();
  console.log(
    'Preview checks passed: delayed hero at 375/1440px, failed-load retry, and no-JS hero.',
  );
} finally {
  await browser.close();
}
