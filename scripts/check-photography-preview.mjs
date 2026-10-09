// ==========================================
// 📸 PHOTOGRAPHY HERO & BLURRED PREVIEW TEST (scripts/check-photography-preview.mjs)
// ==========================================
// When visitors open your photography portfolio, you want an instant, luxurious experience!
// High-resolution photographs can take a moment to download over slow mobile data.
// Rather than showing an ugly blank white box, this website uses an "Instant Blurred Preview":
// 1. A tiny, feather-light preview thumbnail appears instantly while the full 4K photo loads.
// 2. ZERO LAYOUT SHIFT: The photo frame never suddenly jumps or expands when the sharp image arrives.
// 3. FADE-IN SWAP: Once the sharp photo is ready, the preview gently vanishes.
//
// 🎯 WHAT THIS SCRIPT DOES:
// It launches an automated browser (Playwright) to prove 3 scenarios work flawlessly:
// - Scenario 1: Slow Network: The blurred preview holds the space without shifting layout.
// - Scenario 2: Network Crash: A friendly "Retry loading" button appears if a photo fails.
// - Scenario 3: No JavaScript: Even if a visitor has JS turned off, the photo still displays!

// Smoke-test the photography listing page across responsive breakpoints.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const base = process.env.PREVIEW_CHECK_URL || 'http://127.0.0.1:4323/photography/';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let heroBody;
let heroContentType;

try {
  // ==========================================
  // 🔬 SCENARIO 1: SLOW CONNECTION & LAYOUT SHIFT CHECK
  // ==========================================
  // We test on both a mobile screen (375px) and a desktop monitor (1440px).
  for (const width of [375, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();

    // 📥 Capture the image data so we can reuse it later in the No-JS test
    page.on('response', async (response) => {
      if (response.url().includes('/photos/588176e9b85445d319829378ab9beff3-')) {
        heroBody = Buffer.from(await response.body());
        heroContentType = await response.headerValue('content-type');
      }
    });

    // ⏳ ARTIFICIAL 1.2 SECOND DELAY:
    // Deliberately hold back the sharp high-res image so we can inspect the temporary preview
    let releaseHero;
    const heroHeld = new Promise((resolve) => (releaseHero = resolve));
    await page.route('**/photos/588176e9b85445d319829378ab9beff3-*', async (route) => {
      releaseHero();
      await delay(1200);
      await route.continue();
    });

    // 🚪 Load the photography page
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await heroHeld;

    // 🔍 CHECK 1: The blurred preview (.photo-preview) is visible and painted
    await page.waitForFunction(() => document.querySelector('.photo-preview')?.naturalWidth > 0);
    // 🔍 CHECK 2: The sharp image has NOT finished yet (proving the preview appeared first!)
    assert.equal(await page.locator('[data-slide-image]').evaluate((img) => img.complete), false);

    // 👉 Click the first photo dot
    await page.locator('[data-photo-index="0"]').click();
    assert.equal(
      await page.locator('.photo-preview').count(),
      1,
      'same-photo click removed preview',
    );

    // 📐 MEASURE FRAME BEFORE: Record the exact pixel position of the image frame
    const before = await page.locator('[data-photo-viewport]').boundingBox();
    await page.screenshot({ path: `/tmp/photo-preview-${width}.png` });

    // 🖥️ On Desktop: Click "Next Slide" to test slide transitions
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

    // 🔍 CHECK 3: Wait until the sharp photo completes and preview disappears
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
    // 📐 MEASURE FRAME AFTER: The frame dimensions must match BEFORE down to the pixel!
    // This proves ZERO LAYOUT SHIFT (the page never jumpily moves under the visitor's thumb)
    const after = await page.locator('[data-photo-viewport]').boundingBox();
    assert.deepEqual(after, before, `viewport shifted at ${width}px`);
    await context.close();
  }

  // ==========================================
  // 🔬 SCENARIO 2: NETWORK FAILURE & "RETRY" DRILL
  // ==========================================
  // What happens if downloading the hero photograph gets aborted?
  // We simulate a network failure to prove:
  // 1. The screen displays a clear, polite error box (.photo-error).
  // 2. A "Retry loading" button appears.
  // 3. Clicking "Retry loading" reconnects and downloads the picture cleanly!

  const failedContext = await browser.newContext({ viewport: { width: 375, height: 900 } });
  const failedPage = await failedContext.newPage();
  let failedOnce = false;

  // 💥 Abort the first download attempt
  await failedPage.route('**/photos/588176e9b85445d319829378ab9beff3-*', async (route) => {
    if (!failedOnce) {
      failedOnce = true;
      await route.abort(); // Simulated network drop!
    } else await route.continue();
  });

  await failedPage.goto(base, { waitUntil: 'domcontentloaded' });
  // 🔍 Confirm error box appears
  await failedPage.locator('.photo-error').waitFor({ timeout: 15000 });
  assert.equal(await failedPage.locator('.photo-preview').count(), 0);

  // 👉 Click "Retry loading" button
  await failedPage.getByRole('button', { name: /retry loading/i }).click();

  // 🔍 Confirm the photograph loads and error box vanishes
  await failedPage.waitForFunction(
    () => document.querySelector('[data-slide-image]')?.naturalWidth > 0,
    null,
    { timeout: 15000 },
  );
  assert.equal(await failedPage.locator('.photo-error').count(), 0);
  await failedContext.close();

  // ==========================================
  // 🔬 SCENARIO 3: NO-JAVASCRIPT FALLBACK DRILL
  // ==========================================
  // Search engines (like Googlebot) and visitors with JavaScript disabled
  // should still see your beautiful photography!
  // We test the website with JavaScript completely switched off:
  const noJsContext = await browser.newContext({
    javaScriptEnabled: false, // 🚫 JavaScript disabled
    viewport: { width: 375, height: 900 },
  });
  const noJsPage = await noJsContext.newPage();
  assert.ok(heroBody?.length, 'delayed hero response was not captured');

  // Serve captured image bytes
  await noJsPage.route('**/photos/588176e9b85445d319829378ab9beff3-*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: heroContentType || 'image/jpeg',
      body: heroBody,
    });
  });

  // 🚪 Load page without JavaScript
  await noJsPage.goto(base, { waitUntil: 'domcontentloaded' });

  // 🔍 Verify that native HTML loads and displays the hero image perfectly!
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
