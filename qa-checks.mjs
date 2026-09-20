import { chromium } from 'playwright-core';
const baseURL = 'http://127.0.0.1:4322';

async function check() {
  const browser = await chromium.launch({ headless: true });

  // Test 1: Mobile nav button at 390px
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto(baseURL + '/');
    await page.waitForLoadState('networkidle');

    const btn = await page.locator('[data-nav-toggle]').count();
    console.log(`[390px] Menu button exists: ${btn > 0}`);

    if (btn > 0) {
      const isVisible = await page.locator('[data-nav-toggle]').isVisible();
      console.log(`[390px] Menu button visible: ${isVisible}`);

      await page.locator('[data-nav-toggle]').click();
      await page.waitForTimeout(300);

      const navVisible = await page.locator('[data-mobile-nav]').isVisible();
      console.log(`[390px] Mobile nav visible after click: ${navVisible}`);

      const expanded = await page.locator('[data-nav-toggle]').getAttribute('aria-expanded');
      console.log(`[390px] aria-expanded: ${expanded}`);

      const links = await page.locator('[data-mobile-nav] a').count();
      console.log(`[390px] Nav links in mobile menu: ${links}`);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      const closed = await page.locator('[data-mobile-nav]').isVisible();
      console.log(`[390px] Mobile nav hidden after Escape: ${!closed}`);
    }

    await ctx.close();
  }

  // Test 2: Desktop nav unchanged at 1280px
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto(baseURL + '/');
    await page.waitForLoadState('networkidle');

    const btn = await page.locator('[data-nav-toggle]').count();
    const isVisible = btn > 0 ? await page.locator('[data-nav-toggle]').isVisible() : false;
    console.log(`[1280px] Menu button exists: ${btn > 0}, visible: ${isVisible}`);

    const desktopLinks = await page.locator('#desktop-nav a').count();
    console.log(`[1280px] Desktop nav links: ${desktopLinks}`);

    await ctx.close();
  }

  // Test 3: Contact page - copy email button
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto(baseURL + '/contact/');
    await page.waitForLoadState('networkidle');

    const copyBtn = await page.locator('[data-copy-email]').count();
    console.log(`[contact] Copy email button exists: ${copyBtn > 0}`);

    if (copyBtn > 0) {
      const label = await page.locator('[data-copy-label]').textContent();
      console.log(`[contact] Copy button label: ${label}`);

      const mailto = await page.locator('.contact-email').getAttribute('href');
      console.log(`[contact] Mailto href: ${mailto}`);
    }

    await ctx.close();
  }

  // Test 4: Post-production thumbnails have labels
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto(baseURL + '/post-production/');
    await page.waitForLoadState('networkidle');

    const labels = await page.locator('.photo-thumb-label').allTextContents();
    console.log(`[post-prod] Thumbnail labels (${labels.length}): ${labels.join(' | ')}`);

    const watchLinks = await page.locator('[data-watch-link]').count();
    console.log(`[post-prod] Watch link elements: ${watchLinks}`);

    if (watchLinks > 0) {
      const watchVisible = await page.locator('[data-watch-link]').isVisible();
      console.log(`[post-prod] Watch link visible: ${watchVisible}`);
      const watchHref = await page.locator('[data-watch-link]').getAttribute('href');
      console.log(`[post-prod] Watch link href: ${watchHref}`);
      const watchRel = await page.locator('[data-watch-link]').getAttribute('rel');
      console.log(`[post-prod] Watch link rel: ${watchRel}`);
    }

    await ctx.close();
  }

  // Test 5: Footer has Post-Production link
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto(baseURL + '/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);

    const footerLinks = await page.locator('.footer-links a').allTextContents();
    console.log(`[footer] Footer links: ${footerLinks.join(' | ')}`);

    await ctx.close();
  }

  // Test 6: Light theme on contact
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.goto(baseURL + '/contact/');
    await page.waitForLoadState('networkidle');

    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    console.log(`[light] Theme: ${theme}`);

    const copyBtn = await page.locator('[data-copy-email]').count();
    console.log(`[light] Copy email button exists: ${copyBtn > 0}`);

    await ctx.close();
  }

  await browser.close();
  console.log('\nAll checks complete.');
}

check().catch(console.error);
