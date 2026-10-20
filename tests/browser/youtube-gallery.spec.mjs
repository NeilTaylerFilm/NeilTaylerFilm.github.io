import { expect, test } from '@playwright/test';

const mixedGallery = '/photography/youtube-gallery-test/';
const videoOnlyGallery = '/photography/youtube-gallery-video-only-test/';
const testVideoId = 'M7lc1UVf-VE';
const mockSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="100%" height="100%" fill="#505550"/></svg>';

async function stubExternalMedia(page, { embedStatus = 200 } = {}) {
  let embedRequests = 0;
  await page.route('**/photos/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: mockSvg }),
  );
  await page.route('https://i.ytimg.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: mockSvg }),
  );
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) => {
    embedRequests++;
    return route.fulfill({
      status: embedStatus,
      contentType: 'text/html',
      body: '<!doctype html><title>Mock embedded player</title>',
    });
  });
  return () => embedRequests;
}

test('mixed gallery loads posters first and creates the privacy-enhanced player only after Play', async ({
  page,
}) => {
  const embedRequests = await stubExternalMedia(page);
  await page.goto(mixedGallery);

  const triggers = page.locator('[data-gallery-trigger]');
  const videos = page.locator('[data-gallery-trigger][data-video-id]');
  await expect(triggers).toHaveCount(5);
  await expect(videos).toHaveCount(3);
  await expect(page.locator('[data-portfolio-dialog]')).not.toHaveAttribute('open', '');
  expect(embedRequests()).toBe(0);
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .some((entry) => entry.name.includes('youtube-nocookie.com')),
    ),
  ).toBe(false);

  await videos.first().click();
  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('iframe')).toHaveCount(0);
  await expect(dialog.locator('[data-portfolio-watch]')).toBeVisible();
  await expect(dialog.locator('[data-photo-index="1"] [data-video-play]')).toHaveAccessibleName(
    'Play video: Landscape video',
  );

  await dialog.locator('[data-photo-index="1"] [data-video-play]').click();
  const iframe = dialog.locator('iframe');
  await expect(iframe).toHaveAttribute(
    'src',
    `https://www.youtube-nocookie.com/embed/${testVideoId}?autoplay=1&controls=1&playsinline=1&rel=0`,
  );
  await expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  await expect(iframe).toHaveAttribute('allowfullscreen', '');
  await expect(iframe).toHaveAttribute('allow', /autoplay/);
  await expect.poll(embedRequests).toBe(1);
  await expect(dialog.locator('[data-portfolio-watch]')).toHaveAttribute(
    'href',
    `https://www.youtube.com/watch?v=${testVideoId}`,
  );
});

test('photo and consecutive video navigation always tears down the previous player', async ({
  page,
}) => {
  const embedRequests = await stubExternalMedia(page);
  await page.goto(mixedGallery);
  const triggers = page.locator('[data-gallery-trigger]');
  const dialog = page.locator('[data-portfolio-dialog]');

  await triggers.first().click();
  await expect(dialog).not.toHaveAttribute('data-video-active', '');
  await dialog.press('ArrowRight');
  await expect(dialog).toHaveAttribute('data-video-active', '');
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Video 2 of 5');
  await dialog.locator('[data-photo-index="1"] [data-video-play]').click();
  await expect.poll(embedRequests).toBe(1);
  await expect(dialog.locator('iframe')).toHaveCount(1);

  await dialog.locator('[data-portfolio-next]').click();
  await expect(dialog.locator('iframe')).toHaveCount(0);
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Video 3 of 5');
  await dialog.locator('[data-photo-index="2"] [data-video-play]').click();
  await expect.poll(embedRequests).toBe(2);
  await expect(dialog.locator('iframe')).toHaveCount(1);

  await dialog.locator('[data-portfolio-next]').click();
  await expect(dialog.locator('iframe')).toHaveCount(0);
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Video 4 of 5');
  await dialog.locator('[data-photo-index="3"] [data-video-play]').click();
  await expect.poll(embedRequests).toBe(3);
  await expect(dialog.locator('iframe')).toHaveCount(1);
  await dialog.locator('[data-portfolio-next]').click();
  await expect(dialog.locator('iframe')).toHaveCount(0);
  await expect(dialog).not.toHaveAttribute('data-video-active', '');
  await expect(dialog.locator('[data-portfolio-caption]')).toHaveText(
    'A photograph after the videos.',
  );
  await dialog.press('ArrowLeft');
  await expect(dialog).toHaveAttribute('data-video-active', '');
  await expect(dialog.locator('iframe')).toHaveCount(0);

  await dialog.locator('[data-portfolio-close]').click();
  await expect(dialog).not.toBeVisible();
  await expect(dialog.locator('iframe')).toHaveCount(0);
});

test('keyboard navigation between photos and videos keeps focus on the active media', async ({
  page,
}) => {
  await stubExternalMedia(page);
  await page.goto(mixedGallery);
  await page.locator('[data-gallery-trigger]').first().click();

  const dialog = page.locator('[data-portfolio-dialog]');
  await dialog.locator('[data-photo-index="0"] img').focus();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Video 2 of 5');
  await expect(dialog.locator('[data-photo-index="1"] [data-video-play]')).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('[data-photo-index="2"] [data-video-play]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('[data-photo-index="3"] [data-video-play]')).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Photo 5 of 5');
  await expect(dialog.locator('[data-photo-index="4"] img')).toBeFocused();
});

test('keyboard navigation from video-only trigger keeps focus on the new video control', async ({
  page,
}) => {
  await stubExternalMedia(page);
  await page.goto(mixedGallery);
  await page.locator('[data-gallery-trigger][data-video-id]').first().click();

  const dialog = page.locator('[data-portfolio-dialog]');
  await dialog.locator('[data-photo-index="1"] [data-video-play]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Video 3 of 5');
  await expect(dialog.locator('[data-photo-index="2"] [data-video-play]')).toBeFocused();
});

test('closing a playing video removes its iframe and restores focus to the opener', async ({
  page,
}) => {
  await stubExternalMedia(page);
  await page.goto(mixedGallery);
  const opener = page.locator('[data-gallery-trigger][data-video-id]').first();
  await opener.click();

  const dialog = page.locator('[data-portfolio-dialog]');
  await dialog.locator('[data-photo-index="1"] [data-video-play]').click();
  await expect(dialog.locator('iframe')).toHaveCount(1);
  await dialog.locator('[data-portfolio-close]').click();

  await expect(dialog).not.toBeVisible();
  await expect(dialog.locator('iframe')).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('video viewer preserves declared aspect ratios in a small viewport', async ({ page }) => {
  await stubExternalMedia(page);
  await page.setViewportSize({ width: 360, height: 300 });
  await page.goto(mixedGallery);
  await page.locator('[data-gallery-trigger][data-video-id]').nth(1).click();

  const box = page.locator('[data-photo-index="2"] [data-video-preview]');
  const ratio = Number(
    await page.locator('[data-gallery-trigger][data-video-id]').nth(1).getAttribute('data-ratio'),
  );
  await expect
    .poll(async () => {
      const bounds = await box.boundingBox();
      return bounds ? bounds.width / bounds.height : 0;
    })
    .toBeCloseTo(ratio, 2);
});

test('video-only draft route renders a video cover and refresh never opens a player', async ({
  page,
}) => {
  await stubExternalMedia(page);
  await page.goto(videoOnlyGallery);
  await expect(page.locator('.gallery-item--video')).toHaveCount(1);
  await expect(page.locator('[data-gallery-trigger]')).toHaveAttribute(
    'data-ratio',
    '1.7777777777777777',
  );
  await expect(page.locator('[data-portfolio-dialog]')).not.toHaveAttribute('open', '');
  await page.locator('[data-gallery-trigger][data-video-id]').click();
  const playButton = page.locator('[data-photo-index="0"] [data-video-play]');
  await playButton.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(playButton).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(playButton).toBeFocused();
  await expect(page.locator('[data-portfolio-dialog] iframe')).toHaveCount(0);
  await page.locator('[data-portfolio-close]').click();

  await page.reload();
  await expect(page.locator('[data-portfolio-dialog]')).not.toHaveAttribute('open', '');
  await expect(page.locator('[data-portfolio-dialog] iframe')).toHaveCount(0);
  await expect(page.locator('[data-portfolio-dialog]')).toHaveAttribute(
    'aria-label',
    'YouTube video-only QA fixture — video',
  );

  await page.goto('/photography/');
  const card = page.locator('.project-card').filter({ hasText: 'YouTube video-only QA fixture' });
  await expect(card.locator('.project-cover img')).toHaveAttribute(
    'src',
    `https://i.ytimg.com/vi/${testVideoId}/hqdefault.jpg`,
  );
  await expect(card.locator('.mono.small')).toHaveText('01 video');
});

test('video slide history closes on Back, restores on Forward, and preserves existing state', async ({
  page,
}) => {
  await stubExternalMedia(page);
  await page.goto(mixedGallery);
  await page.evaluate(() =>
    history.replaceState({ feed: { category: 'Travel' } }, '', location.href),
  );
  const videos = page.locator('[data-gallery-trigger][data-video-id]');
  const dialog = page.locator('[data-portfolio-dialog]');

  await videos.nth(1).click();
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-portfolio-next]').click();
  const marker = await page.evaluate(() => {
    const [key, value] =
      Object.entries(history.state).find(([name]) => name.startsWith('__ntfPhotoViewer_')) || [];
    return { key, value, feed: history.state.feed };
  });
  expect(marker.value.index).toBe(3);
  expect(marker.feed.category).toBe('Travel');

  await page.goBack();
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => history.state.feed.category)).toBe('Travel');

  await page.goForward();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Video 4 of 5');
  await expect(dialog.locator('iframe')).toHaveCount(0);
  await dialog.locator('[data-portfolio-close]').click();
  await expect(dialog).not.toBeVisible();
});

test('mobile video playback retains navigation controls and a failed embed keeps the YouTube fallback', async ({
  page,
}) => {
  const embedRequests = await stubExternalMedia(page, { embedStatus: 403 });
  await page.goto(mixedGallery);
  const touchDevice = await page.evaluate(
    () => matchMedia('(hover: none) and (pointer: coarse)').matches,
  );
  const activate = async (locator) => {
    if (!touchDevice) return locator.click();
    await locator.scrollIntoViewIfNeeded();
    const bounds = await locator.boundingBox();
    if (!bounds) throw new Error('Expected touch target to have visible bounds.');
    await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  };
  const video = page.locator('[data-gallery-trigger][data-video-id]').first();
  await activate(video);
  const dialog = page.locator('[data-portfolio-dialog]');
  const next = dialog.locator('[data-portfolio-next]');
  const previous = dialog.locator('[data-portfolio-prev]');
  await expect(next).toBeVisible();
  await expect(previous).toBeVisible();
  if (touchDevice) await expect(next).toHaveCSS('display', 'grid');

  await activate(dialog.locator('[data-photo-index="1"] [data-video-play]'));
  await expect.poll(embedRequests).toBe(1);
  await expect(dialog.locator('iframe')).toHaveCount(1);
  await expect(dialog.locator('[data-portfolio-watch]')).toBeVisible();
  await expect(dialog.locator('[data-portfolio-watch]')).toHaveAttribute('target', '_blank');
  await activate(next);
  await expect(dialog.locator('iframe')).toHaveCount(0);
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Video 3 of 5');

  const portraitRatio = await page
    .locator('[data-gallery-trigger][data-video-id]')
    .nth(1)
    .getAttribute('data-ratio');
  const wideRatio = await page
    .locator('[data-gallery-trigger][data-video-id]')
    .nth(2)
    .getAttribute('data-ratio');
  expect(Number(portraitRatio)).toBeCloseTo(1080 / 1920);
  expect(Number(wideRatio)).toBeCloseTo(2390 / 1000);
});

test('closing and immediately opening a different item does not let the old Back event close it', async ({
  page,
}) => {
  await stubExternalMedia(page);
  await page.goto(mixedGallery);
  const dialog = page.locator('[data-portfolio-dialog]');
  const triggers = page.locator('[data-gallery-trigger]');
  await triggers.nth(1).click();
  await expect(dialog).toBeVisible();

  await dialog.locator('[data-portfolio-close]').dispatchEvent('click');
  await triggers.nth(4).dispatchEvent('click');
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveAttribute('data-video-active', '');
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Photo 5 of 5');
});
