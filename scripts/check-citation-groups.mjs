// ==========================================
// 📚 CITATION CLUSTER & DROPDOWN TEST (scripts/check-citation-groups.mjs)
// ==========================================
// When you cite multiple sources together in a sentence (like 3 or 4 papers),
// this script tests that they collapse into a tidy "+2 more sources" badge!
// 1. Ensures large groups of links don't crowd or clutter reading paragraphs.
// 2. Tests that clicking the badge opens a clean menu with every cited source.
// 3. Tests both desktop mouse clicks and mobile touchscreen taps.

// Run a Playwright test against the citation preview page at various viewports.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const url = process.env.PREVIEW_URL || 'http://127.0.0.1:4323/blog/citation-preview/';
const browser = await chromium.launch({ headless: true });

try {
  for (const width of [320, 375, 390, 430, 1440]) {
    const touch = width < 500;
    const page = await browser.newPage({
      viewport: { width, height: 844 },
      hasTouch: touch,
      isMobile: touch,
      deviceScaleFactor: touch ? 2 : 1,
    });
    await page.route('https://**/favicon.ico', (route) => route.abort());
    await page.route(url, async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        '<p>Links without the',
        '<p id="meaningful-break"><a href="https://one.example/" title="cite">First</a> then <a href="https://two.example/" title="cite">Second</a> plus <a href="https://three.example/" title="cite">Third</a>.</p><p>Links without the',
      );
      await route.fulfill({ response, body: html });
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const three = page.locator('.prose p').filter({ hasText: 'For several source types together' });
    const four = page.locator('.prose p').filter({ hasText: 'A longer set can include another source' });
    const pair = page.locator('.prose p').filter({ hasText: 'A pair of sources works the same way' });
    assert.equal(await three.locator('.citation-more > summary .citation-count').textContent(), '+2');
    assert.match(await three.locator('.citation-more > summary').innerText(), /BFI article\s*\+2/);
    assert.equal(await three.locator('.citation-cluster > a[title="cite"]').count(), 0);
    assert.equal(await three.locator('.citation-more > summary a').count(), 0);
    assert.equal(await three.locator('.citation-more > summary img[data-citation-icon]').count(), 1);
    assert.equal(await three.locator('.citation-source-list a[title="cite"]').count(), 3);
    assert.equal(await four.locator('.citation-more > summary .citation-count').textContent(), '+3');
    assert.equal(await four.locator('.citation-source-list a[title="cite"]').count(), 4);
    assert.equal(await pair.locator('.citation-more').count(), 0);
    assert.equal(await pair.locator('a[title="cite"]').count(), 2);
    if (touch) {
      const pairTargetHeights = await pair.locator('a[title="cite"]').evaluateAll((links) =>
        links.map((link) => link.getBoundingClientRect().height),
      );
      assert.ok(pairTargetHeights.every((height) => height >= 44), `${width}px paired citation links are at least 44px tall`);
    }
    assert.equal(await page.locator('#meaningful-break .citation-more').count(), 0);
    assert.equal(await page.locator('#meaningful-break a[title="cite"]').count(), 3);
    assert.equal(await page.locator('.prose a:not([title="cite"])').filter({ hasText: 'ordinary Markdown link' }).count(), 1);

    const summary = three.locator('.citation-more > summary');
    await summary.scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);
    await summary.evaluate((el) => {
      el.style.position = 'fixed';
      el.style.right = '8px';
      el.style.top = 'calc(100vh - 30px)';
    });
    await page.waitForTimeout(30);
    const before = await page.evaluate(() => ({
      scroll: scrollY,
      top: document.querySelector('[data-article-body]').getBoundingClientRect().top,
      bottom: document.querySelector('[data-article-body]').getBoundingClientRect().bottom,
      progress: getComputedStyle(document.querySelector('[data-reading-progress]')).transform,
      width: document.documentElement.scrollWidth,
    }));
    if (touch) await summary.tap();
    else {
      await summary.focus();
      await page.keyboard.press('Enter');
    }
    await page.waitForFunction(() => document.querySelector('.citation-more[open] .citation-source-list[data-positioned]'));
    const open = await page.evaluate(() => {
      const panel = document.querySelector('.citation-more[open] .citation-source-list');
      const rect = panel.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        links: [...panel.querySelectorAll('a')].map((a) => a.href),
        rowHeights: [...panel.querySelectorAll('a')].map((a) => a.getBoundingClientRect().height),
        iconCount: panel.querySelectorAll('img[data-citation-icon]').length,
        hiddenIcons: [...panel.querySelectorAll('img[data-citation-icon]')].every((img) => img.hidden),
        scroll: scrollY,
        bodyTop: document.querySelector('[data-article-body]').getBoundingClientRect().top,
        bodyBottom: document.querySelector('[data-article-body]').getBoundingClientRect().bottom,
        progress: getComputedStyle(document.querySelector('[data-reading-progress]')).transform,
      };
    });
    assert.ok(open.left >= 0 && open.right <= open.width, `${width}px popup stays within horizontal viewport`);
    assert.ok(open.top >= 0 && open.bottom <= open.height, `${width}px popup stays within vertical viewport`);
    assert.equal(open.links.length, 3, 'popup shows every source, including the first two');
    assert.equal(open.iconCount, 3, 'popup should retain the icon for every source');
    assert.equal(open.hiddenIcons, true, 'failed favicons hide without removing citation labels');
    if (touch) {
      assert.ok((await summary.boundingBox()).height >= 44, `${width}px touch disclosure is at least 44px tall`);
      assert.ok(open.rowHeights.every((height) => height >= 44), `${width}px touch source rows are at least 44px tall`);
    }
    assert.ok(open.bottom <= open.height - 16, `${width}px popup stays clear of the bottom edge`);
    assert.deepEqual(
      { scroll: open.scroll, top: open.bodyTop, bottom: open.bodyBottom, progress: open.progress },
      { scroll: before.scroll, top: before.top, bottom: before.bottom, progress: before.progress },
      'opening the source list must not shift the page or reading progress',
    );
    const fourSummary = four.locator('.citation-more > summary');
    await fourSummary.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.citation-more[open]').length === 1 && document.querySelectorAll('.citation-more[open] .citation-source-list a').length === 4);
    assert.equal(await three.locator('.citation-more').evaluate((el) => el.open), false, 'opening another group should close the previous one');
    await page.keyboard.press('Escape');
    assert.equal(await three.locator('.citation-more').evaluate((el) => el.open), false);
    assert.equal(await four.locator('.citation-more').evaluate((el) => el.open), false);
    assert.equal(await fourSummary.evaluate((el) => el === document.activeElement), true);
    await summary.click();
    await page.locator('.article-header h1').click();
    assert.equal(await three.locator('.citation-more').evaluate((el) => el.open), false);
    const longLabel = await summary.evaluate((el) => {
      const label = [...el.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
      label.textContent = 'A very long first source label that should still wrap inside the compact citation control';
      return { width: el.clientWidth, scrollWidth: el.scrollWidth, pageWidth: document.documentElement.scrollWidth };
    });
    assert.ok(longLabel.scrollWidth <= longLabel.width, `${width}px long first label should wrap in the control`);
    assert.equal(longLabel.pageWidth, width);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.close();
  }
  const noJs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  await noJs.route('https://**/favicon.ico', (route) => route.abort());
  await noJs.goto(url, { waitUntil: 'domcontentloaded' });
  const noJsSources = await noJs.locator('.prose p').filter({ hasText: 'For several source types together' }).evaluate((paragraph) => ({
    links: paragraph.querySelectorAll('a[title="cite"]').length,
    disclosures: paragraph.querySelectorAll('.citation-more').length,
  }));
  assert.deepEqual(noJsSources, { links: 3, disclosures: 0 }, 'without JavaScript all citation links remain available');
  await noJs.close();
  console.log('Citation grouping, popup, focus, fallback, and layout checks passed.');
} finally {
  await browser.close();
}
