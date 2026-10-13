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
  await expect(slideshow.locator('[data-slide-subtitle]')).toHaveCount(0);

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

test('mobile metadata follows the video and stays visible during playback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://i.ytimg.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"></svg>',
    }),
  );
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Player</title>',
    }),
  );

  await page.goto('/post-production/');
  const slideshow = page.locator('[data-video-viewer]');
  const viewport = slideshow.locator('[data-photo-viewport]');
  const details = slideshow.locator('.photo-details');
  const filmstrip = slideshow.locator('[data-photo-filmstrip]');

  const layout = await slideshow.evaluate((root) => {
    const bounds = (selector) => {
      const { x, y, width, height } = root.querySelector(selector).getBoundingClientRect();
      return { x, y, width, height, bottom: y + height };
    };
    return {
      count: root.querySelectorAll('.photo-details').length,
      viewport: bounds('[data-photo-viewport]'),
      details: bounds('.photo-details'),
      filmstrip: bounds('[data-photo-filmstrip]'),
    };
  });
  expect(layout.count).toBe(1);
  expect(layout.details.x).toBeCloseTo(layout.viewport.x, 1);
  expect(layout.details.width).toBeCloseTo(layout.viewport.width, 1);
  expect(layout.details.y).toBeGreaterThanOrEqual(layout.viewport.bottom);
  expect(layout.filmstrip.y).toBeGreaterThanOrEqual(layout.details.bottom);
  expect(layout.viewport.width / layout.viewport.height).toBeCloseTo(16 / 9, 1);
  await expect(filmstrip).toBeVisible();

  await slideshow.locator('[data-photo-index="1"]').click();
  await expect(slideshow).toHaveAttribute('data-index', '1');
  await expect(slideshow.locator('[data-photo-index="1"]')).toHaveAttribute('aria-current', 'true');
  await expect(slideshow.locator('[data-slide-caption]')).toHaveText('Body Language — Fun Sponge');
  await expect(slideshow.locator('[data-slide-subtitle]')).toHaveCount(0);
  await expect(slideshow.locator('[data-watch-link]')).toHaveAttribute(
    'href',
    'https://youtu.be/dnJWWsIn_nY',
  );

  await slideshow.locator('[data-photo-index="2"]').click();
  await expect(slideshow.locator('[data-slide-caption]')).toHaveText(
    "I'm Gonna F*** You All Night — Nick Helm",
  );
  await expect(slideshow.locator('[data-slide-subtitle]')).toHaveCount(0);
  expect(
    await slideshow
      .locator('[data-slide-caption]')
      .evaluate((title) => title.scrollWidth <= title.clientWidth),
  ).toBe(true);

  await slideshow.locator('[data-photo-index="0"]').click();
  await expect(slideshow.locator('[data-photo-index="0"]')).toHaveAttribute('aria-current', 'true');
  await expect(slideshow.locator('[data-slide-subtitle]')).toHaveText(
    'Editor · Colourist · BTS Photographer',
  );
  await slideshow.locator('[data-video-play]').click();
  await expect(viewport.locator('iframe.video-iframe')).toHaveCount(1);
  await expect(details).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(details).toBeHidden();
});

test('mobile keyboard and touch gestures still navigate the slideshow', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'This check targets mobile input.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/post-production/');

  const slideshow = page.locator('[data-video-viewer]');
  const thumbnails = slideshow.locator('[data-photo-index]');
  await thumbnails.nth(0).focus();

  await page.keyboard.press('ArrowRight');
  await expect(slideshow).toHaveAttribute('data-index', '1');
  await page.keyboard.press('End');
  await expect(slideshow).toHaveAttribute('data-index', '6');
  await page.keyboard.press('Home');
  await expect(slideshow).toHaveAttribute('data-index', '0');

  const swipe = (startX, endX) =>
    page.evaluate(
      ({ startX, endX }) => {
        const viewport = document.querySelector('[data-video-viewer] [data-photo-viewport]');
        const start = { clientX: startX, clientY: 100 };
        const end = { clientX: endX, clientY: 100 };
        const dispatch = (type, touches, changedTouches) => {
          const event = new Event(type, { bubbles: true });
          Object.defineProperties(event, {
            touches: { value: touches },
            changedTouches: { value: changedTouches },
          });
          viewport.dispatchEvent(event);
        };
        dispatch('touchstart', [start], [start]);
        dispatch('touchend', [], [end]);
      },
      { startX, endX },
    );

  await swipe(300, 230);
  await expect(slideshow).toHaveAttribute('data-index', '1');
  await swipe(230, 300);
  await expect(slideshow).toHaveAttribute('data-index', '0');
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

test('mobile configured project links stay in the metadata area', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://i.ytimg.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"></svg>',
    }),
  );
  await page.route('**/post-production/', async (route) => {
    const response = await route.fetch();
    let html = await response.text();
    const attribute = html.match(/data-slides="([^"]*)"/);
    expect(attribute).not.toBeNull();
    const slides = JSON.parse(
      attribute[1]
        .replaceAll('&quot;', '"')
        .replaceAll('&amp;', '&')
        .replace(/&#(?:39|x27);/g, "'"),
    );
    slides[1].project = '20261009-astbmb-scenebreakdown';
    slides[1].projectLabel = 'Open project article';
    const encodedSlides = JSON.stringify(slides).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
    html = html.replace(attribute[0], `data-slides="${encodedSlides}"`);
    await route.fulfill({ response, body: html });
  });

  await page.goto('/post-production/');
  const slideshow = page.locator('[data-video-viewer]');
  const projectLink = slideshow.locator('[data-photo-project]');
  await expect
    .poll(() => slideshow.evaluate((root) => JSON.parse(root.dataset.slides || '[]')[1].project))
    .toBe('20261009-astbmb-scenebreakdown');
  await slideshow.locator('[data-photo-index="1"]').click();
  await expect(slideshow.locator('[data-slide-caption]')).toHaveText('Body Language — Fun Sponge');
  await expect(projectLink).toBeVisible();
  await expect(projectLink).toHaveText('Open project article');
  await expect(projectLink).toHaveAttribute(
    'href',
    '/post-production/20261009-astbmb-scenebreakdown/',
  );
  const linkBelowVideo = await slideshow.evaluate((root) => {
    const viewport = root.querySelector('[data-photo-viewport]').getBoundingClientRect();
    const link = root.querySelector('[data-photo-project]').getBoundingClientRect();
    return link.top >= viewport.bottom;
  });
  expect(linkBelowVideo).toBe(true);
});
