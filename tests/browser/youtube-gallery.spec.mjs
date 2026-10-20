import { expect, test } from '@playwright/test';

const mixedGallery = '/photography/youtube-gallery-test/';
const videoOnlyGallery = '/photography/youtube-gallery-video-only-test/';
const testVideoId = 'M7lc1UVf-VE';
const mockSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="100%" height="100%" fill="#505550"/></svg>';
const missingThumbnailSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="90"><rect width="100%" height="100%" fill="#505550"/></svg>';

async function stubExternalMedia(
  page,
  { embedStatus = 200, thumbnailPlaceholder = false, customPosterPlaceholder = false } = {},
) {
  let embedRequests = 0;
  await page.route('**/photos/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: customPosterPlaceholder ? missingThumbnailSvg : mockSvg,
    }),
  );
  await page.route('https://i.ytimg.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: thumbnailPlaceholder ? missingThumbnailSvg : mockSvg,
    }),
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

test('hides YouTube’s valid missing-thumbnail image while leaving the video playable', async ({
  page,
}) => {
  const embedRequests = await stubExternalMedia(page, { thumbnailPlaceholder: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(mixedGallery);
  const video = page.locator('[data-gallery-trigger][data-video-id]').nth(1);
  await video.scrollIntoViewIfNeeded();
  await expect
    .poll(() => video.locator('img').evaluate((image) => [image.naturalWidth, image.naturalHeight]))
    .toEqual([120, 90]);
  await expect(video.locator('img')).toHaveAttribute('data-youtube-thumbnail', '');
  await expect
    .poll(() =>
      video.evaluate((item) =>
        item.closest('.gallery-item--video').hasAttribute('data-thumbnail-failed'),
      ),
    )
    .toBe(true);
  await expect(video.locator('img')).toHaveCSS('visibility', 'hidden');

  await page.locator('[data-gallery-trigger]').first().click();
  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const preview = dialog.locator('[data-photo-index="2"] [data-video-preview] img');
  await expect
    .poll(() => preview.evaluate((image) => [image.naturalWidth, image.naturalHeight]))
    .toEqual([120, 90]);
  await expect(preview).toBeHidden();
  await dialog.locator('[data-photo-index="2"] [data-video-play]').click();
  await expect(dialog.locator('iframe')).toHaveCount(1);
  await expect.poll(embedRequests).toBe(1);
});

test('custom posters stay visible even when their dimensions match YouTube’s placeholder', async ({
  page,
}) => {
  await stubExternalMedia(page, { customPosterPlaceholder: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(mixedGallery);
  await page.locator('[data-gallery-trigger]').first().click();
  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toBeVisible();
  for (let index = 0; index < 3; index++) await page.keyboard.press('ArrowRight');

  const poster = page.locator('[data-photo-index="3"] [data-video-preview] img');
  await expect(dialog).toBeVisible();
  await expect(poster).toBeVisible();
  await expect(poster).not.toHaveAttribute('data-youtube-thumbnail', '');
});

test('mixed gallery routes large and small video playback by rendered tile size @desktop-regression', async ({
  page,
}) => {
  const embedRequests = await stubExternalMedia(page);
  await page.setViewportSize({ width: 1440, height: 900 });
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

  const fit = await videos.evaluateAll((items) =>
    items.map((item) => getComputedStyle(item.querySelector('img')).objectFit),
  );
  expect(fit).toEqual(['cover', 'cover', 'cover']);

  const firstVideo = videos.first();
  const initialSize = await firstVideo.evaluate((item) => {
    const { width, height } = item.getBoundingClientRect();
    return { width, height };
  });
  await firstVideo.click();
  const dialog = page.locator('[data-portfolio-dialog]');
  const inlineIframe = page.locator('.gallery-video-player iframe');
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(inlineIframe).toHaveCount(1);
  await expect.poll(embedRequests).toBe(1);
  await expect(firstVideo).toHaveAttribute('aria-hidden', 'true');
  expect(
    await firstVideo.evaluate((item) => {
      const { width, height } = item.getBoundingClientRect();
      return { width, height };
    }),
  ).toEqual(initialSize);
  await expect(inlineIframe).toHaveAttribute(
    'src',
    `https://www.youtube-nocookie.com/embed/${testVideoId}?autoplay=1&controls=1&playsinline=1&rel=0`,
  );
  await expect(inlineIframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  await expect(inlineIframe).toHaveAttribute('allowfullscreen', '');
  await expect(inlineIframe).toHaveAttribute('allow', /autoplay/);

  await videos.nth(1).click();
  const viewerIframe = dialog.locator('iframe');
  await expect(dialog).toBeVisible();
  await expect(inlineIframe).toHaveCount(0);
  await expect(viewerIframe).toHaveCount(1);
  await expect.poll(embedRequests).toBe(2);
  await expect(dialog.locator('[data-portfolio-watch]')).toHaveAttribute(
    'href',
    `https://www.youtube.com/watch?v=${testVideoId}`,
  );
  await dialog.locator('[data-portfolio-close]').click();
  await expect(viewerIframe).toHaveCount(0);
  await videos.nth(2).click();
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(page.locator('.gallery-video-player iframe')).toHaveCount(1);
  await expect.poll(embedRequests).toBe(3);
});

test('a resized inline player stays aligned with its tile without restarting @desktop-regression', async ({
  page,
}) => {
  const embedRequests = await stubExternalMedia(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    document.addEventListener(
      'load',
      (event) => {
        if (event.target instanceof HTMLIFrameElement) {
          event.target.dataset.loadCount = String(Number(event.target.dataset.loadCount || 0) + 1);
        }
      },
      true,
    );
  });
  await page.goto(mixedGallery);
  const video = page.locator('[data-gallery-trigger][data-video-id]').first();
  await video.click();
  const iframe = page.locator('.gallery-video-player iframe');
  const player = page.locator('.gallery-video-player');
  await expect(iframe).toHaveCount(1);
  await expect.poll(embedRequests).toBe(1);
  await expect.poll(() => iframe.getAttribute('data-load-count')).toBe('1');

  await page.setViewportSize({ width: 900, height: 900 });
  await expect
    .poll(async () => {
      const [frame, poster] = await Promise.all([player.boundingBox(), video.boundingBox()]);
      return frame && poster
        ? Math.abs(frame.width - poster.width) + Math.abs(frame.height - poster.height)
        : -1;
    })
    .toBeLessThan(1);
  await expect(iframe).toHaveCount(1);
  await expect.poll(embedRequests).toBe(1);
  await expect.poll(() => iframe.getAttribute('data-load-count')).toBe('1');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.gallery-video-player iframe')).toHaveCount(0);
  await expect(video).toBeFocused();
  await expect(video.locator('img')).toBeVisible();
  await expect.poll(embedRequests).toBe(1);
});

test('Space starts a large video inline without opening PhotoViewer @desktop-regression', async ({
  page,
}) => {
  await stubExternalMedia(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(mixedGallery);
  const video = page.locator('[data-gallery-trigger][data-video-id]').first();
  await video.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.gallery-video-player iframe')).toHaveCount(1);
  await expect(page.locator('[data-portfolio-dialog]')).not.toHaveAttribute('open', '');
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

test('keyboard activation starts a small video, and viewer navigation stops it', async ({
  page,
}) => {
  const embedRequests = await stubExternalMedia(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(mixedGallery);
  const portrait = page.locator('[data-gallery-trigger][data-video-id]').nth(1);
  await portrait.focus();
  await page.keyboard.press('Enter');

  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('iframe')).toHaveCount(1);
  await expect.poll(embedRequests).toBe(1);
  await dialog.press('ArrowRight');
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Video 4 of 5');
  await expect(dialog.locator('iframe')).toHaveCount(0);
  await expect(dialog.locator('[data-photo-index="3"] [data-video-play]')).toBeVisible();
  expect(embedRequests()).toBe(1);
});

test('closing a playing video removes its iframe and restores focus to the opener', async ({
  page,
}) => {
  await stubExternalMedia(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(mixedGallery);
  const opener = page.locator('[data-gallery-trigger][data-video-id]').nth(1);
  await opener.click();

  const dialog = page.locator('[data-portfolio-dialog]');
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

test('video-only featured video plays inline and refresh never restores a player', async ({
  page,
}) => {
  await stubExternalMedia(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(mixedGallery);
  await page.locator(`.project-card h2 a[href="${videoOnlyGallery}"]`).click();
  await expect(page.locator('.gallery-item--video')).toHaveCount(1);
  await expect(page.locator('[data-gallery-trigger]')).toHaveAttribute(
    'data-ratio',
    '1.7777777777777777',
  );
  await expect(page.locator('[data-portfolio-dialog]')).not.toHaveAttribute('open', '');
  const video = page.locator('[data-gallery-trigger][data-video-id]');
  const dimensions = await video.evaluate((item) => {
    const rect = item.getBoundingClientRect();
    const galleryWidth = item.closest('.gallery').getBoundingClientRect().width;
    return { width: rect.width, height: rect.height, galleryWidth };
  });
  expect(dimensions.width).toBeGreaterThanOrEqual(dimensions.galleryWidth * 0.85);
  expect(dimensions.height).toBeGreaterThanOrEqual(180);
  await video.click();
  await expect(page.locator('.gallery-video-player iframe')).toHaveCount(1);
  await expect(page.locator('[data-portfolio-dialog]')).not.toHaveAttribute('open', '');

  await page.goBack();
  await expect(page).toHaveURL(/youtube-gallery-test\/$/);
  await expect(page.locator('.gallery-video-player iframe')).toHaveCount(0);
  await page.goForward();
  await expect(page).toHaveURL(/youtube-gallery-video-only-test\/$/);
  await expect(page.locator('.gallery-video-player iframe')).toHaveCount(0);

  await page.reload();
  await expect(page.locator('[data-portfolio-dialog]')).not.toHaveAttribute('open', '');
  await expect(page.locator('[data-portfolio-dialog] iframe')).toHaveCount(0);
  await expect(page.locator('.gallery-video-player iframe')).toHaveCount(0);
  await expect(page.locator('[data-portfolio-dialog]')).toHaveAttribute(
    'aria-label',
    'YouTube video-only QA fixture — video',
  );

  await page.goto('/photography/');
  const card = page.locator('.project-card').filter({ hasText: 'YouTube video-only QA fixture' });
  await expect(card.locator('.project-cover img')).toHaveAttribute(
    'src',
    `https://i.ytimg.com/vi/${testVideoId}/mqdefault.jpg`,
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
  await page.setViewportSize({ width: 390, height: 844 });
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
  const video = page.locator('[data-gallery-trigger][data-video-id]').nth(1);
  await activate(video);
  const dialog = page.locator('[data-portfolio-dialog]');
  const next = dialog.locator('[data-portfolio-next]');
  const previous = dialog.locator('[data-portfolio-prev]');
  await expect(next).toBeVisible();
  await expect(previous).toBeVisible();
  if (touchDevice) await expect(next).toHaveCSS('display', 'grid');

  await expect.poll(embedRequests).toBe(1);
  await expect(dialog.locator('iframe')).toHaveCount(1);
  await expect(dialog.locator('[data-portfolio-watch]')).toBeVisible();
  await expect(dialog.locator('[data-portfolio-watch]')).toHaveAttribute('target', '_blank');
  await activate(next);
  await expect(dialog.locator('iframe')).toHaveCount(0);
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Video 4 of 5');

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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(mixedGallery);
  const dialog = page.locator('[data-portfolio-dialog]');
  const triggers = page.locator('[data-gallery-trigger]');
  await triggers.nth(2).click();
  await expect(dialog).toBeVisible();

  await dialog.locator('[data-portfolio-close]').dispatchEvent('click');
  await triggers.nth(4).dispatchEvent('click');
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toHaveAttribute('data-video-active', '');
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Photo 5 of 5');
});
