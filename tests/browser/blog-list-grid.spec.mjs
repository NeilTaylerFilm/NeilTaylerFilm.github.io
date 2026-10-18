import { expect, test } from '@playwright/test';

const cardSelector = '[data-blog-feed] > .blog-card';
const viewButtonSelector = (view) => `[data-blog-view-controls] button[data-blog-view="${view}"]`;

async function visibleIds(page) {
  return page.locator(`${cardSelector}:visible`).evaluateAll((cards) =>
    cards.map((card) => card.dataset.id),
  );
}

async function columnCount(locator) {
  return locator.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(/\s+/).length,
  );
}

test('Blog index defaults to List and switches one shared card set to responsive Grid', async ({
  page,
}) => {
  await page.goto('/');

  const feed = page.locator('[data-blog-feed]');
  const cards = page.locator(cardSelector);
  const listButton = page.locator(viewButtonSelector('list'));
  const gridButton = page.locator(viewButtonSelector('grid'));

  await expect(cards).toHaveCount(3);
  await expect(listButton).toHaveAttribute('aria-pressed', 'true');
  await expect(gridButton).toHaveAttribute('aria-pressed', 'false');
  await expect(feed).not.toHaveCSS('display', 'grid');

  const originalIds = await cards.evaluateAll((items) => items.map((item) => item.dataset.id));
  const originalOrder = await cards.locator('h2 a').allTextContents();
  expect(new Set(originalIds).size).toBe(originalIds.length);

  await gridButton.click();
  await expect(gridButton).toHaveAttribute('aria-pressed', 'true');
  await expect(listButton).toHaveAttribute('aria-pressed', 'false');
  await expect(feed).toHaveCSS('display', 'grid');
  await expect(cards).toHaveCount(3);
  expect(await cards.evaluateAll((items) => items.map((item) => item.dataset.id))).toEqual(
    originalIds,
  );
  expect(await cards.locator('h2 a').allTextContents()).toEqual(originalOrder);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(() => columnCount(feed)).toBe(3);
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect.poll(() => columnCount(feed)).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => columnCount(feed)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await expect(page.locator(`${cardSelector}:not(.has-image)`)).toHaveCount(2);
  await expect(page.locator(`${cardSelector} .card-image`)).toHaveCount(1);
  await expect(page.locator(`${cardSelector}:not(.has-image) > .card-content`).first()).toHaveCSS(
    'border-top-style',
    'solid',
  );

  await listButton.click();
  await expect(feed).not.toHaveCSS('display', 'grid');
  expect(await cards.evaluateAll((items) => items.map((item) => item.dataset.id))).toEqual(
    originalIds,
  );
});

test('view changes preserve the active Blog filter, order, and query string', async ({ page }) => {
  await page.goto('/');

  const filter = page.locator('select[name="category"]');
  const sort = page.locator('select[name="sort"]');
  const filterValue = await filter.locator('option').nth(1).getAttribute('value');
  expect(filterValue).toBeTruthy();

  await sort.selectOption('oldest');
  await filter.selectOption(filterValue);
  const activeUrl = page.url();
  const activeIds = await visibleIds(page);
  expect(activeIds.length).toBeGreaterThan(0);

  await page.locator(viewButtonSelector('grid')).click();
  expect(page.url()).toBe(activeUrl);
  expect(await visibleIds(page)).toEqual(activeIds);

  await page.locator(viewButtonSelector('list')).click();
  expect(page.url()).toBe(activeUrl);
  expect(await visibleIds(page)).toEqual(activeIds);
});

test('view preference survives navigating away and back to the Blog index', async ({ page }) => {
  await page.goto('/');
  await page.locator(viewButtonSelector('grid')).click();

  const postHref = await page.locator(`${cardSelector} h2 a`).first().getAttribute('href');
  expect(postHref).toBeTruthy();
  await page.goto(postHref);
  await page.goto('/');

  await expect(page.locator(viewButtonSelector('grid'))).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-blog-feed]')).toHaveCSS('display', 'grid');
});

test('toggle remains keyboard operable and exposes a visible focus state', async ({ page }) => {
  await page.goto('/');
  const listButton = page.locator(viewButtonSelector('list'));
  const gridButton = page.locator(viewButtonSelector('grid'));

  await listButton.click();
  await page.keyboard.press('Tab');
  await expect(gridButton).toBeFocused();
  await expect(gridButton).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Space');

  await expect(gridButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-blog-feed]')).toHaveCSS('display', 'grid');
});

test('invalid or blocked localStorage does not prevent the index or toggle from working', async ({
  browser,
}) => {
  const invalidContext = await browser.newContext();
  await invalidContext.addInitScript(() => localStorage.setItem('neil-blog-view', 'cards'));
  const invalidPage = await invalidContext.newPage();
  await invalidPage.goto('/');
  await expect(invalidPage.locator(viewButtonSelector('list'))).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await invalidPage.locator(viewButtonSelector('grid')).click();
  await expect(invalidPage.locator('[data-blog-feed]')).toHaveCSS('display', 'grid');
  await invalidContext.close();

  const blockedContext = await browser.newContext();
  await blockedContext.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Storage is unavailable');
      },
    });
  });
  const blockedPage = await blockedContext.newPage();
  await blockedPage.goto('/');
  await blockedPage.locator(viewButtonSelector('grid')).click();
  await expect(blockedPage.locator('[data-blog-feed]')).toHaveCSS('display', 'grid');
  await expect(blockedPage.locator(`${cardSelector}`)).toHaveCount(3);
  await blockedContext.close();
});

test('Blog index remains in the working List presentation without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.locator('[data-blog-view-controls]')).toBeHidden();
  await expect(page.locator('[data-blog-feed]')).not.toHaveCSS('display', 'grid');
  await expect(page.locator(cardSelector)).toHaveCount(3);
  await expect(page.locator(`${cardSelector} h2 a`).first()).toBeVisible();

  await context.close();
});
