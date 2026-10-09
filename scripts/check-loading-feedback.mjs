// ==========================================
// 🐌 SLOW NETWORK & LOADING FEEDBACK TESTER (scripts/check-loading-feedback.mjs)
// ==========================================
// Have you ever used a website on a train when your phone has spotty reception,
// clicked a photo, and wondered: "Did anything happen? Did my click work?"
// When websites stay silent during delays, visitors get frustrated and mash buttons.
//
// 🎯 WHAT THIS SCRIPT DOES:
// It launches an automated robot browser (Playwright) that deliberately throttles
// network speeds down to a crawl, testing two critical safety features:
// 1. Reassuring Feedback: Does the screen say "Loading photograph 2 of 8…" or "Loading player…"?
// 2. Error Recovery: If a photo fails to download, does a friendly "Retry" button appear?
// 3. Accessibility: When you hit Escape, does keyboard focus jump back to your starting point?

// Verify loading feedback is visible when images are throttled.
// --- BORROWED TOOLS (Imports) ---
// assert: Node.js strict assertion library.
import assert from 'node:assert/strict';
// chromium: Playwright automated browser for simulated network testing.
import { chromium } from '@playwright/test';

// 🤖 Launch a headless Chromium browser in the background
const browser = await chromium.launch({ headless: true });
try {
  // 📱💻 TEST ACROSS TWO DIFFERENT SCREENS:
  // - 375px width (Apple iPhone screen)
  // - 1440px width (MacBook / Desktop widescreen monitor)
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });

    // ⏳ SIMULATE A SLOW MOBILE CONNECTION:
    // Every time the browser asks to download a photo, we force it to wait 400 milliseconds (nearly half a second).
    // This gives us enough time to inspect the screen and prove the loading spinner / text is showing!
    await page.route('**/*', async (route) => {
      if (route.request().resourceType() === 'image') {
        await new Promise((resolve) => setTimeout(resolve, 400));
        await route.fulfill({
          status: 200,
          contentType: 'image/gif',
          body: Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64'),
        });
        return;
      }
      await route.continue();
    });

    // 📺 SIMULATE A SLOW YOUTUBE CONNECTION:
    // Delay video player responses by 1.2 seconds to test the video player's loading message.
    await page.route('https://www.youtube-nocookie.com/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' });
    });

    // 🎬 Navigate to the film and post-production page
    await page.goto('http://127.0.0.1:4323/post-production/', { waitUntil: 'domcontentloaded' });
    const viewer = page.locator('[data-video-viewer]');
    const slides = JSON.parse(await viewer.getAttribute('data-slides'));
    const image = viewer.locator('[data-slide-image]');
    const original = await image.getAttribute('src');

    // 👉 Click "Next Slide" button
    await viewer.locator('[data-slide-next]').click();
    await page.waitForTimeout(60);

    // 🔍 CHECK 1: The screen must say "Loading photograph 2 of..." so the user knows it worked!
    assert.match(await viewer.locator('[data-photo-status]').textContent(), /^Loading photograph 2 of /);
    // 🔍 CHECK 2: aria-busy must be true so blind visitors' screen readers announce the loading state
    assert.equal(await viewer.locator('[data-photo-viewport]').getAttribute('aria-busy'), 'true');
    // 🔍 CHECK 3: The old picture remains visible until the new one is ready (no blank white flashes!)
    assert.equal(await image.getAttribute('src'), original);

    // 👉 Click "Next Slide" again to reach slide 3
    await viewer.locator('[data-slide-next]').click();
    await page.waitForFunction(() => document.querySelector('[data-slide-count]')?.textContent?.startsWith('03 /'));
    assert.equal(await viewer.locator('[data-slide-image]').getAttribute('alt'), slides[2].alt);

    // 👉 Click the video "Play" button
    await viewer.locator('[data-video-play]').click();
    // 🔍 CHECK 4: Screen confirms "Loading player…" while YouTube connects
    assert.equal(await viewer.locator('[data-video-status]').textContent(), 'Loading player…');

    // 🔄 Edge case check: What if the visitor changes slides while a video was still loading?
    // It should cancel the video player and clear the loading text cleanly!
    await viewer.evaluate((root) => {
      root.dataset.index = '2';
      root.dispatchEvent(new Event('photo-change'));
    });
    assert.equal(await viewer.locator('[data-video-status]').textContent(), '');
    await page.waitForTimeout(1300);
    assert.equal(await viewer.locator('[data-video-status]').textContent(), '');
    assert.equal(await viewer.locator('iframe').count(), 0);
    await page.close();
  }

  // ==========================================
  // 🔬 PART 2: THE LIGHTBOX FAILURE & RETRY DRILL
  // ==========================================
  // What happens if a visitor's mobile signal completely drops right as they tap a photo?
  // We simulate a network crash (404 error) to test that:
  // 1. The viewer politely explains: "Photograph could not load."
  // 2. A "Retry" button appears.
  // 3. Tapping "Retry" after signal returns successfully downloads the photo!
  // 4. Pressing Escape returns your keyboard cursor to where you started.

  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('http://127.0.0.1:4323/photography/20260809-late-night-drive-bts/', {
    waitUntil: 'domcontentloaded',
  });

  // 🎯 Find the first photo thumbnail in the album gallery
  const trigger = page.locator('[data-gallery-trigger]').first();
  const imageUrl = `${await trigger.getAttribute('href')}?loading-feedback-check=${Date.now()}`;
  await trigger.locator('img').evaluate((image) => image.decode());
  await trigger.evaluate((anchor, href) => {
    anchor.href = href;
    anchor.removeAttribute('data-lightbox-srcset');
  }, imageUrl);

  // 💥 SIMULATE NETWORK SIGNAL CUTTING OUT:
  // The first attempt will intentionally fail (404 Not Found).
  // When the visitor clicks "Retry", the second attempt will succeed with a 200 OK!
  let failed = false;
  await page.route(imageUrl, async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({ status: 404, body: 'missing' }); // ⚡ Signal drop!
    } else {
      await new Promise((resolve) => setTimeout(resolve, 500)); // ⏳ Signal restored after 500ms
      await route.fulfill({
        status: 200,
        contentType: 'image/gif',
        body: Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64'),
      });
    }
  });

  // 👉 Click thumbnail to open the full-screen Lightbox
  await trigger.click();
  const lightbox = page.locator('[data-lightbox]');

  // 🔍 Step 1: Confirms initial loading announcement
  assert.match(await lightbox.locator('[data-lightbox-feedback]').textContent(), /^Loading photograph 1 of /);

  // 🔍 Step 2: Confirms graceful error message when download fails
  await page.waitForFunction(() => document.querySelector('[data-lightbox-feedback]')?.textContent === 'Photograph could not load.');
  assert.equal(await lightbox.locator('[data-lightbox-open]').getAttribute('href'), imageUrl);

  // ⌨️ Step 3: KEYBOARD ACCESSIBILITY DRILL (Tab navigation)
  // Visitors using keyboards or screen-readers press Tab to jump between buttons.
  // We test that pressing Tab lands smoothly on "Retry", then "Open original"!
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  assert.equal(await lightbox.locator('[data-lightbox-retry]').evaluate((button) => document.activeElement === button), true);
  await page.keyboard.press('Tab');
  assert.equal(await lightbox.locator('[data-lightbox-open]').evaluate((link) => document.activeElement === link), true);

  // 👉 Step 4: Click the "Retry" button now that signal is restored
  await lightbox.locator('[data-lightbox-retry]').click();
  await page.waitForFunction(() => {
    const dialog = document.querySelector('[data-lightbox]');
    return dialog?.querySelector('[data-lightbox-feedback]')?.textContent === '' &&
      dialog.querySelector('[data-lightbox-actions]')?.hasAttribute('hidden');
  });

  // 👉 Step 5: Advance slide, then press Escape to close full-screen viewer
  await lightbox.locator('[data-lightbox-next]').click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[data-lightbox]')?.open);
  await page.waitForTimeout(600);

  // 🔍 Step 6: FOCUS RESTORATION
  // Accessibility Gold Standard: When you close a popup with Escape, your cursor
  // MUST return to the original thumbnail you clicked, so you don't get lost on the page!
  assert.equal(await trigger.evaluate((element) => document.activeElement === element), true);
  await page.close();
} finally {
  // 🚪 Close automated browser cleanly
  await browser.close();
}
console.log('Loading feedback checks passed at 375px and 1440px.');
