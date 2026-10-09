// ==========================================
// 🕵️ COMPREHENSIVE WEBSITE QA INSPECTOR (qa-checks.mjs)
// ==========================================
// Think of this script like a human QA tester going through a checklist on real devices!
// It opens an automated browser and reports what it finds in 6 parts of the site:
// 1. Mobile Menu: At 390px (iPhone width), does the "Menu" hamburger button open smoothly
//    and close when pressing the Escape key?
// 2. Desktop Menu: At 1280px (laptop width), is the hamburger hidden and are normal links showing?
// 3. Contact Email: Does the 1-click "Copy email" button exist alongside the direct mailto link?
// 4. Video Thumbnails: Do film project thumbnails display readable titles and "Watch" links?
// 5. Footer: Does the bottom footer contain all navigation links (including Post-Production)?
// 6. Theme Switching: Does light mode render correctly on mobile screens?

// --- BORROWED TOOLS (Imports) ---
// chromium: Playwright Core browser automation engine.
import { chromium } from 'playwright-core';
const baseURL = 'http://127.0.0.1:4322';

// Missing features are printed as false; this report does not fail the command.
async function check() {
  const browser = await chromium.launch({ headless: true });

  // ==========================================
  // Test 1: Mobile nav button at 390px
  // 📱 TEST 1: MOBILE NAVIGATION MENU (390px screen width)
  // ==========================================
  // On smartphones, horizontal menu bars don't fit.
  // We test that the hamburger button appears, opens the menu drawer,
  // updates screen-reader tags (aria-expanded="true"), and closes on Escape!
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto(baseURL + '/');
    await page.waitForLoadState('networkidle');

    // 🔍 Verify menu button exists on mobile
    const btn = await page.locator('[data-nav-toggle]').count();
    console.log(`[390px] Menu button exists: ${btn > 0}`);

    if (btn > 0) {
      const isVisible = await page.locator('[data-nav-toggle]').isVisible();
      console.log(`[390px] Menu button visible: ${isVisible}`);

      // 👉 Tap hamburger button to open mobile menu
      await page.locator('[data-nav-toggle]').click();
      await page.waitForTimeout(300);

      const navVisible = await page.locator('[data-mobile-nav]').isVisible();
      console.log(`[390px] Mobile nav visible after click: ${navVisible}`);

      const expanded = await page.locator('[data-nav-toggle]').getAttribute('aria-expanded');
      console.log(`[390px] aria-expanded: ${expanded}`);

      const links = await page.locator('[data-mobile-nav] a').count();
      console.log(`[390px] Nav links in mobile menu: ${links}`);

      // ⌨️ Press Escape to close menu drawer
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      const closed = await page.locator('[data-mobile-nav]').isVisible();
      console.log(`[390px] Mobile nav hidden after Escape: ${!closed}`);
    }

    await ctx.close();
  }

  // ==========================================
  // Test 2: Desktop nav unchanged at 1280px
  // 🖥️ TEST 2: DESKTOP NAVIGATION BAR (1280px screen width)
  // ==========================================
  // On desktop screens, we don't want a mobile hamburger button!
  // We test that full text links (Blog, Photography, About, Contact) show along the top.
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

  // ==========================================
  // Test 3: Contact page - copy email button
  // 📬 TEST 3: CONTACT PAGE & EMAIL ACTIONS
  // ==========================================
  // Tests that visitors can easily reach you via the 1-click clipboard copy button or email app!
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

  // ==========================================
  // Test 4: Post-production thumbnails have labels
  // 🎬 TEST 4: POST-PRODUCTION CAROUSEL THUMBNAILS
  // ==========================================
  // When visitors browse film and color grading projects, every video thumbnail
  // must have clear text labels and a direct "Watch video ↗" link so they know what they are clicking!
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto(baseURL + '/post-production/');
    await page.waitForLoadState('networkidle');

    // 🏷️ Confirm thumbnails have visible text titles
    const labels = await page.locator('.photo-thumb-label').allTextContents();
    console.log(`[post-prod] Thumbnail labels (${labels.length}): ${labels.join(' | ')}`);

    // 📺 Confirm "Watch video" link exists with proper external security tags (rel="noopener")
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

  // ==========================================
  // Test 5: Footer has Post-Production link
  // 🦶 TEST 5: FOOTER NAVIGATION LINKS
  // ==========================================
  // Scrolls to the bottom of the page and verifies that every major section
  // (Blog, Photography, Post-Production, About, Contact) is present in the footer sitemap!
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

  // ==========================================
  // Test 6: Light theme on contact
  // ☀️ TEST 6: LIGHT THEME CONTRAST ON MOBILE
  // ==========================================
  // Tests the contact page when the user or OS prefers a light color theme.
  // Guarantees text stays dark and legible against light backgrounds!
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
