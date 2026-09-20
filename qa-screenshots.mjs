import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';

const baseURL = 'http://127.0.0.1:4333';
const outDir = '/tmp/qa-screenshots';
mkdirSync(outDir, { recursive: true });

const pages = [
  { url: '/', name: 'homepage', widths: [390, 768, 1280] },
  { url: '/contact/', name: 'contact', widths: [390, 768] },
  { url: '/post-production/', name: 'post-production', widths: [390, 768, 1280] },
];

const browser = await chromium.launch({ headless: true });
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

// Mobile nav open state
{
  const context = await browser.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' });
  const page = await context.newPage();
  await page.goto(baseURL + '/');
  await page.waitForLoadState('networkidle');
  const menuBtn = page.locator('[data-nav-toggle]');
  if (await menuBtn.count() > 0) {
    await menuBtn.click();
    await page.waitForTimeout(300);
    const filename = '/tmp/qa-screenshots/homepage-390px-menu-open.png';
    await page.screenshot({ path: filename });
    console.log(`Saved: ${filename}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const filename2 = '/tmp/qa-screenshots/homepage-390px-menu-closed.png';
    await page.screenshot({ path: filename2 });
    console.log(`Saved: ${filename2}`);
  }
  await context.close();
}

await browser.close();
console.log('Done.');
