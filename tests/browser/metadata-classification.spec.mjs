import { expect, test } from '@playwright/test';

test('Blog and Post Production cards and detail pages use category and tags', async ({ page }) => {
  await page.goto('/');
  const blogCard = page.locator('.blog-card').filter({ hasText: 'Canon R6 III Long-Term Review' });
  await expect(blogCard.locator('.category-pill')).toHaveText('Review');
  await expect(blogCard.locator('.tag-label')).toHaveText('Photography');
  await blogCard.locator('h2 a').click();
  await expect(page.locator('.article-header .category-pill')).toHaveText('Review');
  await expect(page.locator('.article-header .tag-label')).toHaveText('Photography');

  await page.goto('/post-production/');
  const projectCard = page
    .locator('.project-card')
    .filter({ hasText: 'A Song To Be Murdered By - Scene Breakdown' });
  await expect(projectCard.locator('.category-pill')).toHaveText('Explainer');
  await expect(projectCard.locator('.tag-label')).toHaveText('YouTube');
  await projectCard.locator('h2 a').click();
  await expect(page.locator('.article-header .category-pill')).toHaveText('Explainer');
});

test('photography category filter accepts legacy type URLs and writes category URLs', async ({
  page,
}) => {
  await page.goto('/photography/?type=Travel');

  const filter = page.getByLabel('Filter by category');
  await expect(filter).toHaveValue('travel');
  await expect(page.locator('[data-feed-item]:not([hidden])')).not.toHaveCount(0);
  await expect(page.locator('.project-card:not([hidden]) .category-pill').first()).toHaveText(
    'Travel',
  );

  const legacyResults = await page
    .locator('[data-feed-item]:not([hidden])')
    .evaluateAll((cards) =>
      cards.every((card) => JSON.parse(card.dataset.filterValues || '[]').includes('Travel')),
    );
  expect(legacyResults).toBe(true);

  await filter.selectOption('sports');
  await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBe('sports');
  await expect.poll(() => new URL(page.url()).searchParams.has('type')).toBe(false);
  await expect(filter).toHaveValue('sports');

  const categoryResults = await page
    .locator('[data-feed-item]:not([hidden])')
    .evaluateAll((cards) =>
      cards.every((card) => JSON.parse(card.dataset.filterValues || '[]').includes('Sports')),
    );
  expect(categoryResults).toBe(true);
});

test('photography category takes precedence when both filter parameters are supplied', async ({
  page,
}) => {
  await page.goto('/photography/?category=Sports&type=Travel');

  await expect(page.getByLabel('Filter by category')).toHaveValue('sports');
  const results = await page
    .locator('[data-feed-item]:not([hidden])')
    .evaluateAll((cards) =>
      cards.every((card) => JSON.parse(card.dataset.filterValues || '[]').includes('Sports')),
    );
  expect(results).toBe(true);
});

test('Blog archive filters by primary category, independently of secondary tags', async ({
  page,
}) => {
  await page.goto('/');
  const filter = page.getByLabel('Filter by category');
  await expect(page.getByText('Category', { exact: true })).toBeVisible();

  const options = await filter
    .locator('option')
    .evaluateAll((items) =>
      items.slice(1).map((item) => ({ value: item.value, label: item.textContent?.trim() ?? '' })),
    );
  expect(options.map((option) => option.label)).toContain('Review');
  expect(options.map((option) => option.label)).not.toContain('Photography');

  await filter.selectOption('review');
  const cards = page.locator('[data-feed-item]:not([hidden])');
  await expect(cards).toHaveCount(1);
  await expect(cards.first().locator('.category-pill')).toHaveText('Review');
});

test('Post Production archive filter continues matching secondary tags', async ({ page }) => {
  await page.goto('/post-production/');
  const filter = page.getByLabel('Filter by tags');
  await expect(page.getByText('Tags', { exact: true })).toBeVisible();
  const options = await filter
    .locator('option')
    .evaluateAll((items) =>
      items.slice(1).map((item) => ({ value: item.value, label: item.textContent?.trim() ?? '' })),
    );

  expect(options.length).toBeGreaterThan(0);
  expect(options.map((option) => option.label)).toContain('YouTube');
  expect(options.map((option) => option.label)).not.toContain('Explainer');
  for (const option of options) {
    await filter.selectOption(option.value);
    const cards = page.locator('[data-feed-item]:not([hidden])');
    await expect(cards).not.toHaveCount(0);
    const match = await cards.evaluateAll(
      (items, selected) =>
        items.every((item) =>
          JSON.parse(item.dataset.filterValues || '[]').some(
            (value) => value.trim().toLocaleLowerCase('en') === selected,
          ),
        ),
      option.value,
    );
    expect(match, `/post-production/ filter option ${option.label}`).toBe(true);
  }
});

test('photography accepts case-insensitive canonical category query values', async ({ page }) => {
  await page.goto('/photography/?category=TRAVEL');

  await expect(page.getByLabel('Filter by category')).toHaveValue('travel');
  await expect(page.locator('[data-feed-item]:not([hidden])')).not.toHaveCount(0);
});
