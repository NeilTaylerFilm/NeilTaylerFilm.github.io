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

test('Blog filtering uses primary categories, leaving secondary tags out of the category list', async ({
  page,
}) => {
  await page.goto('/');

  const filter = page.locator('select[name="category"]');
  await expect(page.locator('.feed-controls label').first().locator('span')).toHaveText('Category');
  await expect(filter.locator('option').first()).toHaveText('All categories');
  await expect(filter.locator('option')).toHaveText(['All categories', 'Review']);

  const categoryCard = page
    .locator(`${cardSelector}`)
    .filter({ has: page.locator('.category-pill') });
  await expect(categoryCard).toHaveCount(1);
  await expect(categoryCard.locator('.category-pill')).toHaveText('Review');
  await expect(categoryCard.locator('.tag-label')).toHaveText('Photography');

  const uncategorized = page.locator(`${cardSelector}[data-filter-values="[]"]`);
  await expect(uncategorized).toHaveCount(2);
  await expect(page.locator(`${cardSelector}:visible`)).toHaveCount(3);

  await filter.selectOption('review');
  await expect(page.locator(`${cardSelector}:visible`)).toHaveCount(1);
  await expect(categoryCard).toBeVisible();
  await expect(page.locator(`${cardSelector}[data-filter-values="[]"]:visible`)).toHaveCount(0);

  await filter.selectOption('');
  await expect(page.locator(`${cardSelector}:visible`)).toHaveCount(3);
  await expect(uncategorized).toHaveCount(2);
});

test('Blog category URLs resolve categories without reinterpreting former tag values', async ({
  page,
}) => {
  await page.goto('/?category=Photography');

  const filter = page.locator('select[name="category"]');
  await expect(filter).toHaveValue('');
  await expect(page.locator(`${cardSelector}:visible`)).toHaveCount(3);

  await page.goto('/?category=Review&sort=oldest');
  await expect(filter).toHaveValue('review');
  await expect(page.locator('select[name="sort"]')).toHaveValue('oldest');
  await expect(page.locator(`${cardSelector}:visible`)).toHaveCount(1);
  await expect(page.locator(`${cardSelector}:visible .category-pill`)).toHaveText('Review');
});

test('Blog index responsive List/Grid presentation @desktop-regression', async ({ page }) => {
  await page.goto('/');

  const feed = page.locator('[data-blog-feed]');
  const cards = page.locator(cardSelector);
  const listButton = page.locator(viewButtonSelector('list'));
  const gridButton = page.locator(viewButtonSelector('grid'));

  await expect(cards).toHaveCount(3);
  await expect(listButton).toHaveAttribute('aria-pressed', 'true');
  await expect(gridButton).toHaveAttribute('aria-pressed', 'false');
  await expect(listButton).toHaveAccessibleName('List');
  await expect(gridButton).toHaveAccessibleName('Grid');
  await expect(listButton.locator('svg[aria-hidden="true"]')).toBeVisible();
  await expect(gridButton.locator('svg[aria-hidden="true"]')).toBeVisible();
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
  const filterBounds = await page.locator('.feed-controls').boundingBox();
  const toggleBounds = await page.locator('[data-blog-view-controls]').boundingBox();
  const countBounds = await page.locator('[data-feed-count]').boundingBox();
  expect(filterBounds.x + filterBounds.width).toBeLessThan(toggleBounds.x);
  expect(toggleBounds.x + toggleBounds.width).toBeLessThan(countBounds.x);
  await expect.poll(() => columnCount(feed)).toBe(3);
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect.poll(() => columnCount(feed)).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-blog-view-controls]')).toBeHidden();
  await expect(feed).not.toHaveCSS('display', 'grid');
  await expect(listButton).toHaveAttribute('aria-pressed', 'true');
  await expect(gridButton).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  // The saved Grid preference returns when the viewport is wide enough for the toggle.
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('[data-blog-view-controls]')).toBeVisible();
  await expect(gridButton).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => columnCount(feed)).toBe(3);

  await expect(page.locator(`${cardSelector}:not(.has-image)`)).toHaveCount(2);
  await expect(page.locator(`${cardSelector} .card-image`)).toHaveCount(1);
  await expect(page.locator(`${cardSelector}:not(.has-image) > .card-content`).first()).toHaveCSS(
    'border-top-style',
    'solid',
  );
  const textCards = page.locator(`${cardSelector}:not(.has-image)`);
  const imageCard = page.locator(`${cardSelector}.has-image`);
  await expect(page.locator(`${cardSelector} .card-reading-cue:visible`)).toHaveCount(2);
  await expect(textCards.first().locator(':scope > .card-content')).toHaveCSS('display', 'flex');
  await expect(textCards.first().locator('.card-content > .card-copy')).toHaveCSS('display', 'flex');
  const textTitle = await textCards.first().locator('h2 a').innerText();
  const metadata = textCards.first().locator('.metadata');
  const headline = textCards.first().locator('h2');
  const subtitle = textCards.first().locator('.card-subtitle');
  await expect(subtitle).toHaveCount(1);
  const metadataTitleGap = await metadata.evaluate((element) => {
    const current = element.getBoundingClientRect();
    const next = element.parentElement.querySelector('h2').getBoundingClientRect();
    return next.top - current.bottom;
  });
  const titleSubtitleGap = await headline.evaluate((element) => {
    const title = element.getBoundingClientRect();
    const next = element.parentElement.querySelector('.card-subtitle').getBoundingClientRect();
    return next.top - title.bottom;
  });
  const subtitleExcerptGap = await subtitle.evaluate((element) => {
    const current = element.getBoundingClientRect();
    const next = element.parentElement.querySelector('.excerpt').getBoundingClientRect();
    return next.top - current.bottom;
  });
  expect(metadataTitleGap).toBeGreaterThanOrEqual(0);
  expect(metadataTitleGap).toBeLessThanOrEqual(15);
  expect(titleSubtitleGap).toBeGreaterThanOrEqual(0);
  expect(titleSubtitleGap).toBeLessThanOrEqual(15);
  expect(subtitleExcerptGap).toBeGreaterThanOrEqual(0);
  expect(subtitleExcerptGap).toBeLessThanOrEqual(15);
  const titleHref = await textCards.first().locator('h2 a').getAttribute('href');
  const readingCue = textCards.first().getByRole('link', { name: `Read article: ${textTitle}` });
  await expect(readingCue).toBeVisible();
  await expect(readingCue).toHaveAttribute('aria-label', `Read article: ${textTitle}`);
  expect(await readingCue.getAttribute('href')).toBe(titleHref);
  const textTitleSize = await textCards.first().locator('h2').evaluate((title) =>
    Number.parseFloat(getComputedStyle(title).fontSize),
  );
  const imageTitleSize = await imageCard.locator('h2').evaluate((title) =>
    Number.parseFloat(getComputedStyle(title).fontSize),
  );
  expect(textTitleSize).toBeGreaterThan(imageTitleSize);
  await expect(imageCard.locator('.card-reading-cue')).toHaveCount(0);
  const accentMarker = await textCards.first().locator('.card-content').evaluate((element) => {
    const marker = getComputedStyle(element, '::before');
    return { width: marker.width, color: marker.backgroundColor };
  });
  expect(accentMarker.width).toBe('34px');
  expect(accentMarker.color).not.toBe('rgba(0, 0, 0, 0)');

  await listButton.click();
  await expect(feed).not.toHaveCSS('display', 'grid');
  await expect(page.locator(`${cardSelector} .card-reading-cue:visible`)).toHaveCount(0);
  expect(await cards.evaluateAll((items) => items.map((item) => item.dataset.id))).toEqual(
    originalIds,
  );
});

test('view changes preserve filter, order, and URL @desktop-regression', async ({ page }) => {
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

test('view preference persists across navigation @desktop-regression', async ({ page }) => {
  await page.goto('/');
  await page.locator(viewButtonSelector('grid')).click();

  const postHref = await page.locator(`${cardSelector} h2 a`).first().getAttribute('href');
  expect(postHref).toBeTruthy();
  await page.goto(postHref);
  await page.goto('/');

  await expect(page.locator(viewButtonSelector('grid'))).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-blog-feed]')).toHaveCSS('display', 'grid');
});

test('view toggle is keyboard accessible @desktop-regression', async ({ page }) => {
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

test('invalid storage keeps the view toggle working @desktop-regression', async ({ browser }) => {
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
