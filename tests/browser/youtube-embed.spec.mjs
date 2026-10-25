import { expect, test } from '@playwright/test';

const articleUrl = '/blog/youtube-embed-preview/';
const videoId = 'M7lc1UVf-VE';
const photoUrl =
  'https://neiltaylerfilm-images.neiltayler2003.workers.dev/photos/ca38db138f024b663b39e003b5ec1eb3-2560.jpeg';
const imageSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="100%" height="100%" fill="#505550"/></svg>';
const placeholderSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="90"><rect width="100%" height="100%" fill="#505550"/></svg>';

async function stubExternalMedia(page, { thumbnailPlaceholder = false } = {}) {
  const embedRequests = [];
  await page.route('https://i.ytimg.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: thumbnailPlaceholder ? placeholderSvg : imageSvg,
    }),
  );
  await page.route(`${new URL(photoUrl).origin}/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: imageSvg }),
  );
  await page.route('https://example.com/favicon.ico', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: imageSvg }),
  );
  await page.route('https://www.youtube-nocookie.com/embed/**', async (route) => {
    embedRequests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Mock YouTube player</title>',
    });
  });
  return embedRequests;
}

test('MDX excerpts stay clean and article photos keep their lightbox', async ({ page }) => {
  const embedRequests = await stubExternalMedia(page);
  await page.goto('/');

  const card = page.locator('.blog-card').filter({ hasText: 'Blog video embed preview' });
  await expect(card).toBeVisible();
  await expect(card.locator('.excerpt')).toHaveText(
    'This draft checks inline video playback. The player stays inside the article.',
  );
  await expect(card.locator('.excerpt')).not.toContainText(/import|YouTubeEmbed|url=/);

  await card.locator('h2 a').click();
  await expect(page).toHaveURL(articleUrl);
  await expect(page.locator('[data-mdx-raw-script]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__mdxRawScriptRan)).toBeUndefined();
  await expect(page.locator('a[title="cite"] img[data-citation-icon]')).toHaveCount(1);

  const articlePhoto = page.locator('[data-article-image-trigger]');
  await expect(articlePhoto).toHaveCount(1);
  await articlePhoto.click();
  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog.getByRole('img', { name: 'Draft article photograph' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
  expect(embedRequests).toHaveLength(0);
});

test('video posters play inline with explicit start times, ratios, and keyboard input', async ({
  page,
}) => {
  const embedRequests = await stubExternalMedia(page);
  await page.goto(articleUrl);

  const frames = page.locator('.youtube-frame');
  const defaultFrame = frames.nth(0);
  const customFrame = frames.nth(1);
  await expect(frames).toHaveCount(2);
  await expect(page.locator('.youtube-frame iframe')).toHaveCount(0);
  await expect(defaultFrame.locator('img')).toHaveAttribute(
    'src',
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
  );
  await expect(customFrame.locator('img')).toHaveAttribute('srcset', /photos/);
  await expect(customFrame.locator('button')).toHaveAccessibleName(
    'Play video: A sequence > another scene.',
  );
  await expect(
    page.locator('.youtube-embed').nth(1).getByRole('link', { name: 'Watch on YouTube' }),
  ).toHaveAttribute('href', `https://www.youtube.com/watch?v=${videoId}`);

  const before = await customFrame.boundingBox();
  expect(before).not.toBeNull();
  expect(before.width / before.height).toBeCloseTo(4 / 3, 2);

  const play = customFrame.getByRole('button', { name: 'Play video: A sequence > another scene.' });
  await play.focus();
  await page.keyboard.press('Enter');
  const player = customFrame.locator('iframe');
  await expect(player).toHaveAttribute('title', 'YouTube video: A sequence > another scene.');
  await expect.poll(() => embedRequests).toHaveLength(1);
  const playerUrl = new URL(embedRequests[0]);
  expect(playerUrl.origin).toBe('https://www.youtube-nocookie.com');
  expect(playerUrl.pathname).toBe(`/embed/${videoId}`);
  expect(playerUrl.searchParams.get('start')).toBe('90');
  expect(playerUrl.searchParams.get('autoplay')).toBe('1');
  const playerBounds = await player.boundingBox();
  expect(playerBounds).not.toBeNull();
  expect(playerBounds.width).toBeCloseTo(before.width, 1);
  expect(playerBounds.height).toBeCloseTo(before.height, 1);
  const after = await customFrame.boundingBox();
  expect(after).not.toBeNull();
  expect(after.width).toBeCloseTo(before.width, 1);
  expect(after.height).toBeCloseTo(before.height, 1);
  await expect(page.locator('[data-portfolio-dialog]')).not.toHaveAttribute('open', '');

  await defaultFrame
    .getByRole('button', { name: 'Play video: A default YouTube thumbnail.' })
    .click();
  await expect(defaultFrame.locator('iframe')).toHaveAttribute(
    'title',
    'YouTube video: A default YouTube thumbnail.',
  );
  expect(embedRequests).toHaveLength(2);
  expect(new URL(embedRequests[1]).searchParams.has('start')).toBe(false);
});

test('missing default thumbnails keep the Play control and YouTube fallback visible', async ({
  page,
}) => {
  await stubExternalMedia(page, { thumbnailPlaceholder: true });
  await page.goto(articleUrl);

  const defaultButton = page.locator('.youtube-play').nth(0);
  await defaultButton.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      defaultButton.locator('img').evaluate((image) => [image.naturalWidth, image.naturalHeight]),
    )
    .toEqual([120, 90]);
  await expect(defaultButton).toHaveAttribute('data-thumbnail-failed', '');
  await expect(defaultButton.locator('img')).toHaveCSS('visibility', 'hidden');
  await expect(defaultButton).toBeVisible();

  await expect(
    page.locator('.youtube-embed').first().getByRole('link', { name: 'Watch on YouTube' }),
  ).toBeVisible();
});
