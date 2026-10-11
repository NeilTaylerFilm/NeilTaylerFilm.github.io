import { expect, test } from '@playwright/test';

const baselineProjects = new Set(['desktop-chromium', 'webkit-iphone-14']);

test.beforeEach(({}, testInfo) => {
  test.skip(
    !baselineProjects.has(testInfo.project.name),
    'Photography lightbox baselines are generated for desktop Chromium and iPhone WebKit.',
  );
});

async function waitForScreenshotReady(page, dialog, imageIndex) {
  await page.addStyleTag({
    content:
      '*,:before,:after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }',
  });
  await page.evaluate(() => document.fonts.ready);
  await expect(dialog.locator('[data-portfolio-feedback]')).toHaveText('');

  if (imageIndex !== undefined) {
    await dialog
      .locator(`.portfolio-slide[data-photo-index="${imageIndex}"] img`)
      .evaluate((image) => image.decode());
  }
}

async function capturePortfolioState(page, dialog, name, imageIndex, assertState) {
  await waitForScreenshotReady(page, dialog, imageIndex);
  await assertState();
  await expect(page).toHaveScreenshot(name, {
    animations: 'disabled',
    maxDiffPixelRatio: 0.001,
  });
}

async function openFirstPortfolioPhoto(page) {
  await page.goto('/photography/');
  const opener = page.locator('[data-portfolio-photo]').first();
  await opener.click();
  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    '0',
  );
  return { opener, dialog };
}

async function addFortyPhotoPortfolioFixture(page, fixtureId) {
  await page.evaluate(async (id) => {
    const { setupPortfolio } = await import('/src/scripts/photography-portfolio.ts');
    const sourceRoot = document.querySelector('[data-portfolio]');
    const sourceGrid = sourceRoot.querySelector('[data-portfolio-grid]');
    const root = sourceRoot.cloneNode(true);
    root.id = id;
    Object.assign(root.style, {
      position: 'fixed',
      left: '8px',
      top: '8px',
      width: `${Math.min(480, innerWidth - 16)}px`,
      zIndex: '9999',
    });
    const grid = root.querySelector('[data-portfolio-grid]');
    grid.style.width = '100%';
    const template = sourceGrid.querySelector('[data-portfolio-photo]');
    const imageTemplate = template.querySelector('img');
    grid.replaceChildren(
      ...Array.from({ length: 40 }, (_, index) => {
        const width = 2400;
        const height = Math.round(2400 / (0.5 + ((index * 17) % 190) / 100));
        const photo = template.cloneNode(false);
        photo.hidden = false;
        photo.removeAttribute('data-revealed');
        photo.removeAttribute('data-project-url');
        photo.dataset.verificationIndex = String(index);
        photo.href = `#photo-${index}`;
        photo.dataset.full = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#303030"/></svg>`)}`;
        photo.dataset.srcset = '';
        photo.style.removeProperty('--row-width');
        photo.style.removeProperty('--row-height');
        photo.style.setProperty('--ar', String(width / height));
        const image = imageTemplate.cloneNode(false);
        image.removeAttribute('srcset');
        image.setAttribute('width', String(width));
        image.setAttribute('height', String(height));
        image.loading = 'lazy';
        image.src = photo.dataset.full;
        photo.replaceChildren(image);
        return photo;
      }),
    );
    document.body.append(root);
    setupPortfolio(root);
  }, fixtureId);

  return page.locator(`#${fixtureId}`);
}

test('portfolio viewer baseline: open on the first photograph', async ({ page }) => {
  const { dialog } = await openFirstPortfolioPhoto(page);

  await capturePortfolioState(page, dialog, 'open-first.png', 0, async () => {
    await expect(dialog).toHaveAttribute('open', '');
    await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
      'data-index',
      '0',
    );
  });
});

test('portfolio viewer baseline: after navigating forward once', async ({ page }) => {
  const { dialog } = await openFirstPortfolioPhoto(page);
  await page.keyboard.press('ArrowRight');

  await capturePortfolioState(page, dialog, 'after-next.png', 1, async () => {
    await expect(dialog).toHaveAttribute('open', '');
    await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
      'data-index',
      '1',
    );
  });
});

test('portfolio viewer baseline: photograph revealed through Load More', async ({ page }) => {
  await page.goto('/photography/');
  const root = await addFortyPhotoPortfolioFixture(page, 'baseline-forty-photo-fixture');
  const photos = root.locator('[data-portfolio-photo]');
  const initialCount = await root.locator('[data-portfolio-photo]:not([hidden])').count();
  const more = root.locator('[data-portfolio-more]');
  await expect(more).toBeVisible();
  await more.evaluate((button) => button.click());
  const opener = photos.nth(initialCount);
  await expect(opener).not.toHaveAttribute('hidden', '');
  await opener.evaluate((photo) => photo.click());
  const dialog = root.locator('[data-portfolio-dialog]');
  const index = initialCount;
  await expect(dialog).toHaveAttribute('open', '');

  await capturePortfolioState(page, dialog, 'load-more-photo.png', index, async () => {
    await expect(opener).toHaveAttribute('data-revealed', '');
    await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
      'data-index',
      String(index),
    );
  });
});

test('portfolio viewer baseline: active dot scrubbing', async ({ page }) => {
  const { dialog } = await openFirstPortfolioPhoto(page);
  const pagination = dialog.locator('[data-portfolio-pagination]');
  await pagination.evaluate((element) => {
    element.querySelectorAll('.portfolio-dot').forEach((dot) => {
      dot.style.pointerEvents = 'none';
    });
  });
  const bounds = await pagination.boundingBox();
  if (!bounds) throw new Error('The photo pagination has no visible bounds.');
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();

  try {
    await expect(pagination).toHaveClass(/is-scrubbing/);
    await page.mouse.move(x + 14, y);
    await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
      'data-index',
      '1',
    );
    await capturePortfolioState(page, dialog, 'active-dot-scrubbing.png', 1, async () => {
      await expect(pagination).toHaveClass(/is-scrubbing/);
      await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
        'data-index',
        '1',
      );
    });
  } finally {
    await page.mouse.up();
  }
});

test('portfolio viewer baseline: closed with focus restored to the opener', async ({ page }) => {
  const { opener, dialog } = await openFirstPortfolioPhoto(page);
  await page.keyboard.press('Escape');

  await capturePortfolioState(page, dialog, 'closed-focus-restored.png', undefined, async () => {
    await expect(dialog).not.toHaveAttribute('open', '');
    await expect(opener).toBeFocused();
  });
});

test('portfolio baseline behavior: Load More order, keyboard, scroll lock, and dismissal', async ({
  page,
}) => {
  await page.goto('/photography/');
  const root = await addFortyPhotoPortfolioFixture(page, 'behavior-forty-photo-fixture');
  const more = root.locator('[data-portfolio-more]');
  await more.evaluate((button) => button.click());

  const visiblePhotos = root.locator('[data-portfolio-photo]:not([hidden])');
  const count = await visiblePhotos.count();
  const opener = visiblePhotos.nth(0);
  await opener.scrollIntoViewIfNeeded();
  const scrollBeforeOpen = await page.evaluate(() => window.scrollY);
  await opener.click();
  const dialog = root.locator('[data-portfolio-dialog]');
  const dots = dialog.locator('.portfolio-dot');
  await expect(dots).toHaveCount(count);

  for (let index = 0; index < count; index++) {
    await dots.nth(index).click();
    await expect(dialog.locator('[data-portfolio-feedback]')).toHaveText('');
    await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
      'data-index',
      String(index),
    );
    const expectedSource = await visiblePhotos.nth(index).getAttribute('data-full');
    const actualSource = await dialog
      .locator(`.portfolio-slide[data-photo-index="${index}"] img`)
      .getAttribute('src');
    expect(actualSource).toBe(expectedSource);
  }

  await page.keyboard.press('ArrowLeft');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    String(count - 2),
  );
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    String(count - 1),
  );
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    String(count - 1),
  );

  await expect(page.locator('html')).toHaveClass(/modal-open/);
  await expect(page.locator('body')).toHaveCSS('position', 'fixed');
  const lockedScroll = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect(await page.evaluate(() => window.scrollY)).toBe(lockedScroll);

  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeOpen);

  await opener.click();
  await expect(dialog).toHaveAttribute('open', '');
  const stage = dialog.locator('[data-portfolio-stage]');
  await stage.evaluate((element) => {
    element.querySelector('.portfolio-media').style.pointerEvents = 'none';
  });
  await stage.click({ position: { x: 2, y: 2 } });
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(opener).toBeFocused();
});

test('portfolio baseline behavior: arrows clamp, scroll is locked, and outside click closes', async ({
  page,
}) => {
  await page.goto('/photography/');
  const photos = page.locator('[data-portfolio-photo]');
  const opener = photos.last();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await opener.scrollIntoViewIfNeeded();
  const scrollBeforeOpen = await page.evaluate(() => window.scrollY);
  await opener.click();

  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    '3',
  );
  await page.keyboard.press('ArrowLeft');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    '2',
  );
  await expect(page.locator('html')).toHaveClass(/modal-open/);
  await expect(page.locator('body')).toHaveCSS('position', 'fixed');
  const lockedScroll = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect(await page.evaluate(() => window.scrollY)).toBe(lockedScroll);

  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeOpen);

  await opener.click();
  await expect(dialog).toHaveAttribute('open', '');
  const stage = dialog.locator('[data-portfolio-stage]');
  await stage.evaluate((element) => {
    element.querySelector('.portfolio-media').style.pointerEvents = 'none';
  });
  await stage.click({ position: { x: 2, y: 2 } });
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(opener).toBeFocused();
});
