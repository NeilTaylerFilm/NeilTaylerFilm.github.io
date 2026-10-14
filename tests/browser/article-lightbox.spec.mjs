import { expect, test } from '@playwright/test';

test('blog images open in order at responsive high resolution and restore focus and scroll', async ({
  page,
}) => {
  await page.goto('/blog/reading-progress-preview/');

  const triggers = page.locator('[data-article-image-trigger]');
  await expect(triggers).toHaveCount(2);
  const opener = triggers.first();
  const nextAlt = await triggers.nth(1).locator('img').getAttribute('alt');
  const source = await opener.evaluate((link) => {
    const image = link.querySelector('img');
    return {
      full: link.dataset.full,
      srcset: link.dataset.srcset,
      alt: image.alt,
    };
  });
  expect(nextAlt).not.toBeFalsy();
  expect(source.full).not.toBe('');
  expect(source.full).toMatch(/-(?:1440|1692)\.jpeg$/);
  expect(source.srcset).toContain('1440w');
  expect(source.alt).toBe('Late night drive behind the scenes');

  await opener.scrollIntoViewIfNeeded();
  const scrollBeforeOpen = await page.evaluate(() => scrollY);
  await opener.focus();
  const focusStyle = await opener.evaluate((link) => ({
    cursor: getComputedStyle(link).cursor,
    imageOutlineWidth: getComputedStyle(link.querySelector('img')).outlineWidth,
    imageOutlineStyle: getComputedStyle(link.querySelector('img')).outlineStyle,
  }));
  expect(focusStyle.cursor).toBe('zoom-in');
  expect(focusStyle.imageOutlineWidth).toBe('2px');
  expect(focusStyle.imageOutlineStyle).toBe('solid');
  if (await page.evaluate(() => matchMedia('(hover: hover)').matches)) {
    await opener.hover();
    const opacity = await opener
      .locator('img')
      .evaluate((image) => Number(getComputedStyle(image).opacity));
    expect(opacity).toBeCloseTo(0.88, 2);
  }
  await page.keyboard.press('Space');

  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Photo 1 of 2');
  const image = dialog.locator('.portfolio-slide[data-photo-index="0"] img');
  await expect(image).toHaveAttribute('srcset', source.srcset);
  await expect(image).toHaveAttribute('alt', source.alt);
  await expect(dialog.getByRole('img', { name: source.alt })).toBeVisible();
  await expect(dialog.getByRole('img')).toHaveCount(1);
  await expect(dialog.locator('[data-portfolio-feedback]')).toHaveText('', { timeout: 30_000 });
  const displayedWidth = await image.evaluate((element) => {
    const match = new URL(element.currentSrc).pathname.match(/-(\d+)\.(?:webp|jpe?g)$/);
    return Number(match?.[1] || 0);
  });
  expect(displayedWidth).toBeGreaterThanOrEqual(960);

  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    '1',
  );
  await expect(dialog.getByRole('img', { name: nextAlt })).toBeVisible();
  await expect(dialog.getByRole('img')).toHaveCount(1);
  await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    '1',
  );
  await page.keyboard.press('Escape');

  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(opener).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(scrollBeforeOpen);
  const layout = await opener.evaluate((link) => {
    link.blur();
    const image = link.querySelector('img');
    const before = image.getBoundingClientRect();
    const originalBounds = [before.x, before.y, before.width, before.height];
    link.replaceWith(image);
    const after = image.getBoundingClientRect();
    const restoredBounds = [after.x, after.y, after.width, after.height];
    return { originalBounds, restoredBounds };
  });
  layout.originalBounds.forEach((value, index) =>
    expect(value).toBeCloseTo(layout.restoredBounds[index], 1),
  );
});

test('post-production article images navigate on touch and hide controls for one image', async ({
  page,
}, testInfo) => {
  await page.goto('/post-production/20261009-astbmb-scenebreakdown/');

  const triggers = page.locator('[data-article-image-trigger]');
  await expect(triggers).toHaveCount(9);
  await expect(page.locator('[data-article-body] [data-gallery-trigger]')).toHaveCount(0);

  const opener = triggers.nth(1);
  if (testInfo.project.name === 'desktop-chromium') await opener.click();
  else await opener.tap();

  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog.locator('[data-portfolio-count]')).toHaveText('Photo 2 of 9');
  const screenshot = dialog.locator('.portfolio-slide[data-photo-index="1"] img');
  await expect(screenshot).toHaveAttribute('alt', '');
  await expect(dialog.locator('[data-portfolio-feedback]')).toHaveText('', { timeout: 30_000 });
  const sourceWidth = await screenshot.evaluate((image) => {
    const match = new URL(image.currentSrc).pathname.match(/-(\d+)\.(?:webp|jpe?g)$/);
    return Number(match?.[1] || 0);
  });
  expect(sourceWidth).toBeGreaterThanOrEqual(1440);
  if (testInfo.project.name === 'desktop-chromium') {
    await expect(dialog.locator('[data-portfolio-prev]')).toBeVisible();
    await expect(dialog.locator('[data-portfolio-next]')).toBeVisible();
  } else {
    await expect(dialog.locator('[data-portfolio-prev]')).toBeHidden();
    await expect(dialog.locator('[data-portfolio-next]')).toBeHidden();
    await dialog.locator('.portfolio-dot').nth(2).tap();
    await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
      'data-index',
      '2',
    );
  }
  await page.keyboard.press('Escape');

  await triggers.evaluateAll((items) => items.slice(1).forEach((item) => item.remove()));
  const onlyImage = page.locator('[data-article-image-trigger]');
  if (testInfo.project.name === 'desktop-chromium') await onlyImage.click();
  else await onlyImage.tap();
  await expect(dialog.locator('[data-portfolio-prev]')).toBeHidden();
  await expect(dialog.locator('[data-portfolio-next]')).toBeHidden();
  await expect(dialog.locator('[data-portfolio-pagination]')).toBeHidden();
});
