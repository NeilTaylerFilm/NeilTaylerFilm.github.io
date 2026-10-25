import { expect, test } from '@playwright/test';

const articleImageOrigin = 'https://neiltaylerfilm-images.neiltayler2003.workers.dev';
const smallImage =
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="#505550"/></svg>';

async function makeSmallImage(image) {
  await image.evaluate((element, source) => {
    element.removeAttribute('srcset');
    element.removeAttribute('sizes');
    element.width = 320;
    element.height = 180;
    element.src = `data:image/svg+xml,${encodeURIComponent(source)}`;
  }, smallImage);
  await expect.poll(() => image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0);
}

async function measureArticle(page, imageAlt) {
  return page.evaluate((alt) => {
    const rect = (element) => {
      const { x, width, height } = element.getBoundingClientRect();
      return { x, width, height };
    };
    const body = document.querySelector('[data-article-body]');
    const text = [...body.querySelectorAll('p')].find(
      (paragraph) => !paragraph.querySelector('img'),
    );
    const image = [...body.querySelectorAll('img:not(.citation-icon)')].find(
      (candidate) => candidate.alt === alt,
    );
    const imageWrapper = image.closest('[data-article-media]');
    const imageContent = image.closest('.article-media-figure');
    const imageCaption = image.closest('figure')?.querySelector('figcaption');
    const chapterNav = document.querySelector('.chapter-nav-desktop');
    const chapterTextRects = chapterNav
      ? [...chapterNav.querySelectorAll('a')].flatMap((link) => {
          const range = document.createRange();
          range.selectNodeContents(link);
          return [...range.getClientRects()];
        })
      : [];
    const video = body.querySelector('.youtube-embed');
    const frame = video?.querySelector('.youtube-frame');
    const caption = video?.querySelector('figcaption');

    return {
      body: rect(body),
      text: rect(text),
      imageWrapper: rect(imageWrapper),
      imageContent: imageContent ? rect(imageContent) : null,
      image: rect(image),
      imageCaption: imageCaption ? rect(imageCaption) : null,
      imageCaptionItalic: imageCaption?.querySelector('em')
        ? getComputedStyle(imageCaption.querySelector('em')).fontStyle === 'italic'
        : false,
      chapterNavRight: chapterNav ? chapterNav.getBoundingClientRect().right : null,
      chapterNavTextRight: chapterTextRects.length
        ? Math.max(...chapterTextRects.map((bounds) => bounds.right))
        : null,
      video: video ? rect(video) : null,
      frame: frame ? rect(frame) : null,
      caption: caption ? rect(caption) : null,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    };
  }, imageAlt);
}

function expectCentered(media, body) {
  expect(media.x + media.width / 2).toBeCloseTo(body.x + body.width / 2, 0);
}

function expectedMediaWidth(viewportWidth) {
  const gutter =
    viewportWidth <= 359
      ? 16
      : viewportWidth <= 540
        ? 20
        : viewportWidth <= 767
          ? 24
          : viewportWidth <= 1050
            ? 32
            : 48;
  return Math.min(viewportWidth <= 1050 ? 700 : 820, viewportWidth - gutter * 2);
}

test('lazy article images reserve dimensions before their sources load', async ({ page }) => {
  let releaseRequest;
  let signalRequest;
  const requestStarted = new Promise((resolve) => {
    signalRequest = resolve;
  });
  await page.route(`${articleImageOrigin}/**`, async (route) => {
    if (route.request().url().includes('31478d01b2c105197ee2cbf77c561a51')) {
      signalRequest();
      await new Promise((resolve) => {
        releaseRequest = resolve;
      });
    }
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1692" height="2560"/>',
    });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/blog/reading-progress-preview/', { waitUntil: 'domcontentloaded' });

  const image = page.locator('[data-article-body] img[alt="Late night drive behind the scenes"]');
  await expect(image).toHaveAttribute('loading', 'lazy');
  await expect(image).toHaveAttribute('width', '1692');
  await image.scrollIntoViewIfNeeded();
  await requestStarted;
  await expect.poll(() => image.evaluate((element) => element.naturalWidth)).toBe(0);
  const before = await image.boundingBox();
  expect(before.width).toBeCloseTo(820, 0);
  expect(before.height).toBeCloseTo(((820 - 2) * 2560) / 1692 + 2, 0);

  releaseRequest();
  await expect.poll(() => image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0);
  const after = await image.boundingBox();
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
});

test('Markdown images and MDX video share centered responsive article media width', async ({
  page,
}) => {
  await page.route(`${articleImageOrigin}/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: smallImage }),
  );
  await page.route('https://i.ytimg.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: smallImage }),
  );

  for (const width of [1440, 1200, 1051, 1050, 1024, 768, 767, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });

    await page.goto('/blog/reading-progress-preview/');
    const markdownImage = page.locator(
      '[data-article-body] img[alt="Late night drive behind the scenes"]',
    );
    await expect(markdownImage).toHaveAttribute('sizes', /820px/);
    await makeSmallImage(markdownImage);
    const markdown = await measureArticle(page, 'Late night drive behind the scenes');
    const mediaWidth = expectedMediaWidth(width);
    expect(markdown.text.width).toBeCloseTo(markdown.body.width, 0);
    expect(markdown.imageWrapper.width).toBeCloseTo(mediaWidth, 0);
    expect(markdown.imageContent.width).toBeCloseTo(markdown.image.width, 0);
    expect(markdown.imageCaption.width).toBeCloseTo(markdown.image.width, 0);
    expect(markdown.imageCaptionItalic).toBe(true);
    expectCentered(markdown.imageCaption, markdown.imageWrapper);
    expectCentered(markdown.imageWrapper, markdown.body);
    if (width >= 1200) {
      expect(markdown.chapterNavRight).toBeLessThanOrEqual(markdown.imageWrapper.x - 15);
      expect(markdown.chapterNavTextRight).toBeLessThanOrEqual(markdown.imageWrapper.x);
    }
    expectCentered(markdown.image, markdown.imageWrapper);
    expect(markdown.image.width).toBeLessThanOrEqual(320);
    expect(markdown.image.width).toBeLessThanOrEqual(markdown.imageWrapper.width);
    expect(markdown.documentWidth).toBeLessThanOrEqual(width);

    await page.goto('/blog/youtube-embed-preview/');
    const mdxImage = page.locator('[data-article-body] img[alt="Draft article photograph"]');
    await expect(mdxImage).toHaveAttribute('sizes', /820px/);
    await makeSmallImage(mdxImage);
    const mdx = await measureArticle(page, 'Draft article photograph');
    expect(mdx.text.width).toBeCloseTo(mdx.body.width, 0);
    expect(mdx.imageWrapper.width).toBeCloseTo(mediaWidth, 0);
    expect(mdx.video.width).toBeCloseTo(mediaWidth, 0);
    expect(mdx.imageCaption).toBeNull();
    expect(mdx.frame.width).toBeCloseTo(mediaWidth, 0);
    expect(mdx.caption.width).toBeCloseTo(mediaWidth, 0);
    expectCentered(mdx.imageWrapper, mdx.body);
    expectCentered(mdx.video, mdx.body);
    expectCentered(mdx.image, mdx.imageWrapper);
    expect(mdx.image.width).toBeLessThanOrEqual(320);
    expect(mdx.frame.width).toBeLessThanOrEqual(width);
    expect(mdx.frame.width / mdx.frame.height).toBeCloseTo(16 / 9, 1);
    expect(mdx.documentWidth).toBeLessThanOrEqual(width);
  }
});
