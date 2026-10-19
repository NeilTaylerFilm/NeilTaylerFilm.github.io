import { expect, test } from '@playwright/test';

const photographyUrl = '/photography/20250317-for-king-and-country-day-01/';

test('Photography recommendations reuse project cards and rank the same production first', async ({
  page,
}) => {
  await page.goto(photographyUrl);

  const related = page.locator('[data-related-content]');
  await expect(related.locator('.section-heading h2')).toHaveText('Related photography projects');
  await expect(related).toHaveAttribute('aria-labelledby', 'related-photography-heading');

  const cards = related.locator('.related-grid > .project-card');
  await expect(cards).toHaveCount(3);
  await expect(related.locator('.related-grid')).toHaveAttribute('data-related-count', '3');
  await expect(cards.first().locator('h2 a')).toHaveText('For King & Country - Day 02');
  await expect(cards.first().locator('.category-pill')).toHaveText('Behind The Scenes');

  const hrefs = await cards
    .locator('h2 a')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(new Set(hrefs).size).toBe(3);
  expect(hrefs).not.toContain(photographyUrl);
  expect(hrefs.every((href) => href?.startsWith('/photography/'))).toBe(true);
});

test('Blog recommendations reuse BlogCard grid cards and keep images lazy', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('.blog-card h2 a')
    .filter({ hasText: 'Inline citation preview' })
    .click();

  const related = page.locator('[data-related-content]');
  await expect(related.locator('.section-heading h2')).toHaveText('Related posts');
  const grid = related.locator('.related-grid');
  await expect(grid).toHaveClass(/related-grid--grid/);
  await expect(grid).toHaveClass(/related-grid--3/);
  await expect(grid).toHaveAttribute('data-related-count', '2');

  const cards = grid.locator(':scope > .blog-card');
  await expect(cards).toHaveCount(2);
  const textCard = grid.locator(':scope > .blog-card:not(.has-image)');
  const imageCard = grid.locator(':scope > .blog-card.has-image');
  await expect(textCard).toHaveCount(1);
  await expect(imageCard).toHaveCount(1);
  await expect(textCard.locator('.card-reading-cue')).toBeVisible();
  await expect(imageCard.locator('.card-reading-cue')).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  const columns = () =>
    grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(/\s+/).length);
  await expect.poll(columns).toBe(3);

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect.poll(columns).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(columns).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const hrefs = await cards
    .locator('h2 a')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(new Set(hrefs).size).toBe(2);
  expect(hrefs.every((href) => href?.startsWith('/blog/'))).toBe(true);

  const imageLoading = await grid
    .locator('img')
    .evaluateAll((images) => images.map((image) => image.getAttribute('loading')));
  expect(imageLoading.length).toBeGreaterThan(0);
  expect(imageLoading.every((loading) => loading === 'lazy')).toBe(true);
});

test('Related Posts stay Grid across saved Blog views @desktop-regression', async ({ page }) => {
  for (const view of ['list', 'grid']) {
    await page.goto('/');
    await page.locator(`[data-blog-view-controls] button[data-blog-view="${view}"]`).click();
    await page.goto('/blog/citation-preview/');

    const related = page.locator('[data-related-content] .related-grid');
    await expect(related).toHaveClass(/related-grid--grid/);
    await expect(related).toHaveClass(/related-grid--3/);
    await expect(related.locator(':scope > .blog-card')).toHaveCount(2);
    await expect(related).toHaveCSS('display', 'grid');
  }
});

test('Post Production suppresses an empty related section when no alternatives exist', async ({
  page,
}) => {
  await page.goto('/post-production/');
  await page.locator('.project-card h2 a').first().click();

  await expect(page.locator('.article-header .category-pill')).toHaveText('Explainer');
  await expect(page.locator('[data-related-content]')).toHaveCount(0);
});

test('related project grids support one, two, and three items across breakpoints', async ({
  page,
}) => {
  await page.goto(photographyUrl);
  const grid = page.locator('[data-related-content] .related-grid');

  const columns = () =>
    grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(/\s+/).length);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(columns).toBe(3);

  await grid.evaluate((element) => {
    element.querySelectorAll(':scope > .project-card').forEach((card, index) => {
      if (index >= 2) card.remove();
    });
    element.classList.remove('related-grid--3');
    element.classList.add('related-grid--2');
  });
  await expect.poll(columns).toBe(2);

  await grid.evaluate((element) => {
    element.querySelector(':scope > .project-card:last-child')?.remove();
    element.classList.remove('related-grid--2');
    element.classList.add('related-grid--1');
  });
  await expect.poll(columns).toBe(1);

  await page.setViewportSize({ width: 1024, height: 900 });
  await grid.evaluate((element) => {
    element.classList.remove('related-grid--1');
    element.classList.add('related-grid--3');
  });
  await expect.poll(columns).toBe(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(columns).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('related project cards preserve hover and keyboard-focus interactions', async ({ page }) => {
  await page.goto(photographyUrl);

  const firstCard = page.locator('[data-related-content] .project-card').first();
  const link = firstCard.locator('h2 a');
  await link.focus();
  await expect(firstCard).toHaveCSS('outline-style', 'solid');

  const cover = firstCard.locator('.project-cover');
  await cover.hover();
  await expect
    .poll(() => cover.locator('img').evaluate((image) => getComputedStyle(image).transform))
    .not.toBe('none');
});
