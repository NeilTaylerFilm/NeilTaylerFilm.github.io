import { expect, test } from '@playwright/test';

test('post-production slideshow shows featured roles without an unconfigured project link', async ({
  page,
}) => {
  await page.route('https://i.ytimg.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"></svg>',
    }),
  );

  await page.goto('/post-production/');
  const slideshow = page.locator('[data-video-viewer]');
  const projectLink = slideshow.locator('[data-photo-project]');

  await page.evaluate(() => {
    const liveRegion = document.querySelector('[data-photo-status]');
    window.slideAnnouncements = [];
    new MutationObserver(() => window.slideAnnouncements.push(liveRegion.textContent)).observe(
      liveRegion,
      { childList: true, characterData: true, subtree: true },
    );
  });

  await expect(slideshow.locator('[data-slide-type]')).toHaveText('Short Film');
  await expect(slideshow.locator('[data-slide-caption]')).toHaveText('A Song To Be Murdered By');
  await expect(slideshow.locator('[data-slide-subtitle]')).toHaveText(
    'Editor · Colourist · BTS Photographer',
  );
  await expect(projectLink).toBeHidden();
  await expect(projectLink).not.toHaveAttribute('href');
  await expect(slideshow.locator('.work-links')).toBeHidden();
  const slides = await slideshow.evaluate((root) => JSON.parse(root.dataset.slides || '[]'));
  expect(slides).toHaveLength(7);
  expect(slides[0].role).toEqual(['Editor', 'Colourist', 'BTS Photographer']);
  expect(slides[0]).not.toHaveProperty('project');
  expect(slides[0]).not.toHaveProperty('projectLabel');
  expect(slides.slice(1).every((slide) => slide.role === undefined)).toBe(true);

  // Desktop controls become pointer-active when the image viewport is hovered.
  await slideshow.locator('[data-photo-viewport]').hover();
  await slideshow.locator('[data-slide-next]').click();
  await expect
    .poll(() => page.evaluate(() => window.slideAnnouncements))
    .toContain('Loading project 2 of 7.');
  await expect(slideshow).toHaveAttribute('data-index', '1');
  await expect(projectLink).toBeHidden();
  await expect(projectLink).toHaveText('View project →');

  await slideshow.locator('[data-slide-prev]').click();
  await expect(slideshow).toHaveAttribute('data-index', '0');
  await expect(slideshow.locator('[data-slide-subtitle]')).toHaveText(
    'Editor · Colourist · BTS Photographer',
  );
  await expect(projectLink).toBeHidden();
  await expect(slideshow.locator('.work-links')).toBeHidden();

  await page.evaluate(() => {
    const next = document.querySelector('[data-video-viewer] [data-slide-next]');
    next.click();
    next.click();
    next.click();
  });
  await expect(slideshow).toHaveAttribute('data-index', '3');
  await expect(slideshow.locator('[data-slide-caption]')).toHaveText('On Dover Beach');
  await expect(projectLink).toBeHidden();

  await page.evaluate(() => {
    const previous = document.querySelector('[data-video-viewer] [data-slide-prev]');
    previous.click();
    previous.click();
    previous.click();
  });
  await expect(slideshow).toHaveAttribute('data-index', '0');
  await expect(slideshow.locator('[data-slide-subtitle]')).toHaveText(
    'Editor · Colourist · BTS Photographer',
  );
  await expect(projectLink).toBeHidden();
  await expect(slideshow.locator('.work-links')).toBeHidden();
});

test('a delayed stale image cannot replace the selected project or announce old metadata', async ({
  page,
}) => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"></svg>';

  await page.route('https://i.ytimg.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg });
  });

  await page.goto('/post-production/');
  const slideshow = page.locator('[data-video-viewer]');
  const viewport = slideshow.locator('[data-photo-viewport]');
  const next = slideshow.locator('[data-slide-next]');
  const status = slideshow.locator('[data-photo-status]');
  const projectLink = slideshow.locator('[data-photo-project]');

  await page.evaluate(() => {
    const liveRegion = document.querySelector('[data-photo-status]');
    window.slideAnnouncements = [];
    new MutationObserver(() => window.slideAnnouncements.push(liveRegion.textContent)).observe(
      liveRegion,
      { childList: true, characterData: true, subtree: true },
    );

    const nativeDecode = HTMLImageElement.prototype.decode;
    const staleDecodeResolvers = [];
    window.staleDecodeCount = 0;
    window.releaseStaleDecodes = () => {
      for (const resolve of staleDecodeResolvers.splice(0)) resolve();
    };
    HTMLImageElement.prototype.decode = function () {
      if (this.src.includes('/vi/WHF_J4mL3oc/')) {
        window.staleDecodeCount++;
        return new Promise((resolve) => staleDecodeResolvers.push(resolve));
      }
      return nativeDecode.call(this);
    };
  });

  await viewport.hover();
  await next.click();
  await expect(slideshow).toHaveAttribute('data-index', '1');
  await expect.poll(() => page.evaluate(() => window.staleDecodeCount)).toBeGreaterThan(0);

  await next.click();
  await expect(status).toHaveText('Loading project 3 of 7.');
  await next.click();
  await expect(slideshow).toHaveAttribute('data-index', '3');
  await expect(slideshow.locator('[data-slide-caption]')).toHaveText('On Dover Beach');
  await expect(projectLink).toBeHidden();
  await expect(status).toHaveText('');
  const announcementsAfterCurrentSlide = await page.evaluate(
    () => window.slideAnnouncements.length,
  );

  await page.evaluate(() => window.releaseStaleDecodes());
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );

  await expect(slideshow).toHaveAttribute('data-index', '3');
  await expect(slideshow.locator('[data-slide-caption]')).toHaveText('On Dover Beach');
  await expect(status).toHaveText('');
  expect(
    await page.evaluate(
      (start) => window.slideAnnouncements.slice(start),
      announcementsAfterCurrentSlide,
    ),
  ).toEqual([]);
});

test('article roles are absent without metadata and preview cards never render roles', async ({
  page,
}) => {
  await page.goto('/post-production/20261009-astbmb-scenebreakdown/');

  await expect(
    page.getByRole('heading', { name: /A Song To Be Murdered By - Scene Breakdown/ }),
  ).toBeVisible();
  await expect(page.locator('.post-production-roles')).toHaveCount(0);
  await expect(page.locator('.byline')).toBeVisible();
  await expect(page.locator('.byline').locator('xpath=preceding-sibling::p[1]')).toHaveText(
    'Vanity Fair inspired scene by scene breakdown of "A Song To Be Murdered By", a short film I edited and colour graded in my last year of university.',
  );

  await page.goto('/post-production/');
  await expect(page.locator('.project-card .post-production-roles')).toHaveCount(0);
});
