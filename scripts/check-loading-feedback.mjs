import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
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
    await page.route('https://www.youtube-nocookie.com/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' });
    });
    await page.goto('http://127.0.0.1:4323/post-production/', { waitUntil: 'domcontentloaded' });
    const viewer = page.locator('[data-video-viewer]');
    const slides = JSON.parse(await viewer.getAttribute('data-slides'));
    const image = viewer.locator('[data-slide-image]');
    const original = await image.getAttribute('src');
    await viewer.locator('[data-slide-next]').click();
    await page.waitForTimeout(60);
    assert.match(await viewer.locator('[data-photo-status]').textContent(), /^Loading photograph 2 of /);
    assert.equal(await viewer.locator('[data-photo-viewport]').getAttribute('aria-busy'), 'true');
    assert.equal(await image.getAttribute('src'), original);
    await viewer.locator('[data-slide-next]').click();
    await page.waitForFunction(() => document.querySelector('[data-slide-count]')?.textContent?.startsWith('03 /'));
    assert.equal(await viewer.locator('[data-slide-image]').getAttribute('alt'), slides[2].alt);
    await viewer.locator('[data-video-play]').click();
    assert.equal(await viewer.locator('[data-video-status]').textContent(), 'Loading player…');
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

  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('http://127.0.0.1:4323/photography/20260809-late-night-drive-bts/', {
    waitUntil: 'domcontentloaded',
  });
  const trigger = page.locator('[data-gallery-trigger]').first();
  const imageUrl = `${await trigger.getAttribute('href')}?loading-feedback-check=${Date.now()}`;
  await trigger.locator('img').evaluate((image) => image.decode());
  await trigger.evaluate((anchor, href) => {
    anchor.href = href;
    anchor.removeAttribute('data-lightbox-srcset');
  }, imageUrl);
  let failed = false;
  await page.route(imageUrl, async (route) => {
    if (!failed) {
      failed = true;
      await route.fulfill({ status: 404, body: 'missing' });
    } else {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: 'image/gif',
        body: Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64'),
      });
    }
  });
  await trigger.click();
  const lightbox = page.locator('[data-lightbox]');
  assert.match(await lightbox.locator('[data-lightbox-feedback]').textContent(), /^Loading photograph 1 of /);
  await page.waitForFunction(() => document.querySelector('[data-lightbox-feedback]')?.textContent === 'Photograph could not load.');
  assert.equal(await lightbox.locator('[data-lightbox-open]').getAttribute('href'), imageUrl);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  assert.equal(await lightbox.locator('[data-lightbox-retry]').evaluate((button) => document.activeElement === button), true);
  await page.keyboard.press('Tab');
  assert.equal(await lightbox.locator('[data-lightbox-open]').evaluate((link) => document.activeElement === link), true);
  await lightbox.locator('[data-lightbox-retry]').click();
  await page.waitForFunction(() => {
    const dialog = document.querySelector('[data-lightbox]');
    return dialog?.querySelector('[data-lightbox-feedback]')?.textContent === '' &&
      dialog.querySelector('[data-lightbox-actions]')?.hasAttribute('hidden');
  });
  await lightbox.locator('[data-lightbox-next]').click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[data-lightbox]')?.open);
  await page.waitForTimeout(600);
  assert.equal(await trigger.evaluate((element) => document.activeElement === element), true);
  await page.close();
} finally {
  await browser.close();
}
console.log('Loading feedback checks passed at 375px and 1440px.');
