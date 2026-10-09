// ==========================================
// 📸 THE AUTOMATED SCREENSHOT ROBOT (qa-screenshots.mjs)
// ==========================================
// Instead of manually opening your phone, tablet, and computer to take screenshots,
// this script sends an automated robot camera across your entire site!
//
// 🎯 WHAT IT CAPTURES:
// 1. Multi-Device Layouts: Snaps photos at 390px (Mobile), 768px (iPad/Tablet), and 1280px (Laptop).
// 2. Both Themes: Snaps photos in cozy Dark Mode and crisp Light Mode.
// 3. Interactive States: Captures the mobile menu while open and closed.
// 4. Stores proof PNGs in "/tmp/qa-screenshots/" so you can visually verify designs in seconds!

import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';

const baseURL = 'http://127.0.0.1:4333';
const outDir = '/tmp/qa-screenshots';
// 📁 Create output screenshot directory if it doesn't already exist
mkdirSync(outDir, { recursive: true });

// 📋 Pages and responsive widths to photograph
const pages = [
  { url: '/', name: 'homepage', widths: [390, 768, 1280] },
  { url: '/contact/', name: 'contact', widths: [390, 768] },
  { url: '/post-production/', name: 'post-production', widths: [390, 768, 1280] },
];

const browser = await chromium.launch({ headless: true });

// 🔄 BATCH 1: Dark Mode screenshots across phone, tablet, and laptop
for (const pageDef of pages) {
  for (const w of pageDef.widths) {
    const context = await browser.newContext({ viewport: { width: w, height: 800 }, colorScheme: 'dark' });
    const page = await context.newPage();
    await page.goto(baseURL + pageDef.url);
    await page.waitForLoadState('networkidle');
    const filename = `${outDir}/${pageDef.name}-${w}px-dark.png`;
    await page.screenshot({ path: filename, fullPage: pageDef.url === '/contact/' });
    console.log(`Saved: ${filename}`);
    await context.close();
  }
}

// ☀️ BATCH 2: Light Mode on the contact page (tests bright background contrast)
// Light theme on contact
{
  const context = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'light' });
  const page = await context.newPage();
  await page.goto(baseURL + '/contact/');
  await page.waitForLoadState('networkidle');
  const filename = '/tmp/qa-screenshots/contact-390px-light.png';
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`Saved: ${filename}`);
  await context.close();
}

// ==========================================
// 📱 BATCH 3: MOBILE DRAWER MENU (OPEN & CLOSED)
// ==========================================
// Taps the hamburger button, takes a photo of the open menu overlay,
// presses Escape, and takes a photo of the closed state to prove it resets cleanly!
// Mobile nav open state
{
  const context = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto(baseURL + '/');
  await page.waitForLoadState('networkidle');
  const menuBtn = page.locator('[data-nav-toggle]');
  if (await menuBtn.count() > 0) {
    // 📸 Take photo with menu OPEN
    await menuBtn.click();
    await page.waitForTimeout(300);
    const filename = '/tmp/qa-screenshots/homepage-390px-menu-open.png';
    await page.screenshot({ path: filename });
    console.log(`Saved: ${filename}`);

    // 📸 Take photo with menu CLOSED via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const filename2 = '/tmp/qa-screenshots/homepage-390px-menu-closed.png';
    await page.screenshot({ path: filename2 });
    console.log(`Saved: ${filename2}`);
  }
  await context.close();
}

// 🚪 Close browser and finish report
await browser.close();
console.log('Done.');
