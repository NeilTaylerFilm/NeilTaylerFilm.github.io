import { expect, test } from '@playwright/test';

async function findLightboxPhotoExamples(page) {
  return page.locator('[data-portfolio-photo]:not([hidden])').evaluateAll((photos) => {
    const ratio = (photo) => Number.parseFloat(photo.style.getPropertyValue('--ar'));
    return [
      photos.findIndex((photo) => photo.dataset.projectUrl && ratio(photo) < 1),
      photos.findIndex((photo) => !photo.dataset.projectUrl && ratio(photo) < 1),
      photos.findIndex((photo) => photo.dataset.projectUrl && ratio(photo) > 1),
    ];
  });
}

test('opening a photo renders a visible active carousel dot', async ({ page }) => {
  await page.goto('/photography/');
  await page.locator('[data-portfolio-photo]').first().click();

  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  const dots = dialog.locator('[data-portfolio-dots] .portfolio-dot');
  expect(await dots.count()).toBeGreaterThan(0);

  const activeDot = dialog.locator('[data-portfolio-dots] .portfolio-dot[aria-current="true"]');
  await expect(activeDot).toHaveCount(1);
  const activeStyle = await activeDot.evaluate((dot) => {
    const bounds = dot.getBoundingClientRect();
    const style = getComputedStyle(dot);
    return {
      width: bounds.width,
      height: bounds.height,
      opacity: Number(style.opacity),
      position: style.position,
    };
  });
  expect(activeStyle.width).toBeGreaterThan(0);
  expect(activeStyle.height).toBeGreaterThan(0);
  expect(activeStyle.opacity).toBeGreaterThan(0);
  expect(activeStyle.position).toBe('absolute');
});

test('photo stage fills the viewport above a stable bottom control group', async ({
  page,
}, testInfo) => {
  await page.goto('/photography/');
  const photoIndices = await findLightboxPhotoExamples(page);
  expect(photoIndices.every((index) => index >= 0)).toBe(true);

  const viewports =
    testInfo.project.name === 'desktop-chromium'
      ? [{ width: 1440, height: 900 }]
      : [
          { width: 393, height: 661 },
          { width: 390, height: 844 },
        ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    let previousStageHeight = 0;
    let previousDotsTop = 0;
    for (const index of photoIndices) {
      const hasProjectLink = await page
        .locator('[data-portfolio-photo]')
        .nth(index)
        .evaluate((photo) => Boolean(photo.dataset.projectUrl));
      await page.locator('[data-portfolio-photo]').nth(index).click();
      const dialog = page.locator('[data-portfolio-dialog]');
      await expect(dialog).toHaveAttribute('open', '');
      const project = dialog.locator('[data-portfolio-project]');
      if (hasProjectLink) await expect(project).toBeVisible();
      else await expect(project).toBeHidden();
      const layout = await dialog.evaluate((element) => {
        const imageStage = element.querySelector('[data-portfolio-image-stage]');
        const stage = element.querySelector('[data-portfolio-stage]');
        const dots = element.querySelector('[data-portfolio-pagination]');
        const link = element.querySelector('[data-portfolio-project]');
        const toolbar = element.querySelector('.lightbox-toolbar');
        const controls = element.querySelector('[data-portfolio-controls]');
        const activeDot = element.querySelector('.portfolio-dot[aria-current="true"]');
        const image = element.querySelector(
          `.portfolio-slide[data-photo-index="${activeDot?.dataset.index}"] img`,
        );
        const projectSlot = element.querySelector('.portfolio-project-slot');
        const rect = (target) => {
          const { left, top, right, bottom, width, height } = target.getBoundingClientRect();
          return { left, top, right, bottom, width, height };
        };
        return {
          dialog: rect(element),
          toolbar: rect(toolbar),
          close: rect(element.querySelector('[data-portfolio-close]')),
          imageStage: rect(imageStage),
          stage: rect(stage),
          controls: rect(controls),
          dots: rect(dots),
          link: rect(link),
          projectSlot: rect(projectSlot),
          visualViewportHeight: window.visualViewport?.height,
          controlsPaddingBottom: Number.parseFloat(getComputedStyle(controls).paddingBottom),
          dotsToProjectGap: rect(projectSlot).top - rect(dots).bottom,
          imageFit: getComputedStyle(image).objectFit,
          imageMaxWidth: getComputedStyle(image).maxWidth,
          imageMaxHeight: getComputedStyle(image).maxHeight,
          imageWidth: rect(image).width,
          imageHeight: rect(image).height,
          imageBoxBottomToDot:
            activeDot.getBoundingClientRect().top - image.getBoundingClientRect().bottom,
          imageCenterX: rect(image).left + rect(image).width / 2,
          imageCenterY: rect(image).top + rect(image).height / 2,
        };
      });
      expect(layout.imageStage.height).toBeCloseTo(
        viewport.height - layout.toolbar.height - layout.controls.height,
        0,
      );
      expect(layout.imageWidth).toBeCloseTo(layout.imageStage.width - 16, 0);
      expect(layout.imageHeight).toBeCloseTo(layout.imageStage.height, 0);
      expect(layout.imageCenterX).toBeCloseTo(
        layout.imageStage.left + layout.imageStage.width / 2,
        0,
      );
      expect(layout.imageCenterY).toBeCloseTo(
        layout.imageStage.top + layout.imageStage.height / 2,
        0,
      );
      expect(layout.imageFit).toBe('contain');
      expect(layout.imageMaxWidth).toBe('100%');
      expect(layout.imageMaxHeight).toBe('100%');
      expect(layout.imageBoxBottomToDot).toBeCloseTo(12, 0);
      expect(layout.toolbar.bottom).toBeCloseTo(layout.stage.top, 0);
      expect(layout.stage.top - layout.close.bottom).toBeCloseTo(8, 0);
      expect(layout.stage.bottom).toBeCloseTo(layout.controls.top, 0);
      expect(layout.dots.bottom).toBeLessThan(
        hasProjectLink ? layout.link.top : layout.projectSlot.top,
      );
      expect(layout.controls.bottom).toBeCloseTo(layout.dialog.bottom, 0);
      expect(layout.projectSlot.height).toBe(44);
      expect(layout.dotsToProjectGap).toBeCloseTo(12, 0);
      expect(layout.visualViewportHeight).toBeCloseTo(layout.dialog.height, 0);
      expect(layout.controlsPaddingBottom).toBeGreaterThanOrEqual(12);
      expect(layout.controls.bottom - layout.projectSlot.bottom).toBeCloseTo(
        layout.controlsPaddingBottom,
        0,
      );
      if (previousStageHeight) {
        expect(layout.imageStage.height).toBeCloseTo(previousStageHeight, 0);
        expect(layout.dots.top).toBeCloseTo(previousDotsTop, 0);
      }
      previousStageHeight = layout.imageStage.height;
      previousDotsTop = layout.dots.top;
      await dialog.locator('[data-portfolio-close]').click();
      await expect(dialog).not.toHaveAttribute('open', '');
    }
  }
});

test('dots keep their position while swiping between photos', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 661 });
  await page.goto('/photography/');
  const photoIndices = await findLightboxPhotoExamples(page);
  await page.locator('[data-portfolio-photo]').nth(photoIndices[0]).click();
  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  const before = await dialog.locator('[data-portfolio-pagination]').boundingBox();
  await dialog.locator('[data-portfolio-image-stage]').evaluate((stage) => {
    Object.defineProperty(stage, 'setPointerCapture', { value: () => {} });
    const bounds = stage.getBoundingClientRect();
    const start = bounds.left + bounds.width * 0.75;
    const end = start - bounds.width * 0.4;
    const y = bounds.top + bounds.height / 2;
    const dispatch = (type, x) =>
      stage.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 17,
          pointerType: 'touch',
          isPrimary: true,
          button: 0,
          clientX: x,
          clientY: y,
        }),
      );
    dispatch('pointerdown', start);
    dispatch('pointermove', end);
    dispatch('pointerup', end);
  });
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    String(photoIndices[0] + 1),
  );
  const after = await dialog.locator('[data-portfolio-pagination]').boundingBox();
  expect(after?.y).toBeCloseTo(before?.y ?? 0, 0);
});

test('controls content leaves no more than 24px below it', async ({ page }) => {
  await page.goto('/photography/');
  await page.locator('[data-portfolio-photo]').first().click();
  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  const gaps = await dialog.evaluate((element) => {
    const controls = element.querySelector('[data-portfolio-controls]');
    const dots = element.querySelector('[data-portfolio-pagination]');
    const slot = element.querySelector('.portfolio-project-slot');
    const visualHeight = window.visualViewport?.height ?? window.innerHeight;
    const contentBottom = Math.max(
      dots.getBoundingClientRect().bottom,
      slot.getBoundingClientRect().bottom,
    );
    return {
      belowContent: visualHeight - contentBottom,
      belowControls: visualHeight - controls.getBoundingClientRect().bottom,
    };
  });
  expect(gaps.belowContent).toBeLessThanOrEqual(24);
  expect(gaps.belowControls).toBeLessThanOrEqual(24);
});

test('the project slot stays reserved for photos without a project link', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 661 });
  await page.goto('/photography/');
  const photos = await page
    .locator('[data-portfolio-photo]:not([hidden])')
    .evaluateAll((items) =>
      items.map((photo, index) => ({ index, linked: Boolean(photo.dataset.projectUrl) })),
    );
  const unlinkedIndex = photos.find((photo) => !photo.linked)?.index;
  const linkedIndex = photos.find((photo) => photo.linked)?.index;
  expect(unlinkedIndex).toBeDefined();
  expect(linkedIndex).toBeDefined();
  await expect(page.locator('[data-portfolio-controls]')).toHaveAttribute(
    'data-has-project-links',
    'true',
  );

  const measureSlot = async () =>
    page.locator('.portfolio-project-slot').evaluate((slot) => {
      const bounds = slot.getBoundingClientRect();
      return { top: bounds.top, height: bounds.height };
    });
  const dialog = page.locator('[data-portfolio-dialog]');
  await page.locator('[data-portfolio-photo]').nth(unlinkedIndex).click();
  await expect(dialog.locator('[data-portfolio-project]')).toBeHidden();
  const unlinkedSlot = await measureSlot();
  await dialog.locator('[data-portfolio-close]').click();
  await page.locator('[data-portfolio-photo]').nth(linkedIndex).click();
  await expect(dialog.locator('[data-portfolio-project]')).toBeVisible();
  const linkedSlot = await measureSlot();
  expect(unlinkedSlot.height).toBe(44);
  expect(unlinkedSlot.top).toBeCloseTo(linkedSlot.top, 0);
});

test('the Close focus ring follows keyboard focus, not pointer opening', async ({
  page,
}, testInfo) => {
  await page.goto('/photography/');
  const [linkedPortraitIndex] = await findLightboxPhotoExamples(page);
  const photo = page.locator('[data-portfolio-photo]').nth(linkedPortraitIndex);
  const dialog = page.locator('[data-portfolio-dialog]');
  const close = dialog.locator('[data-portfolio-close]');

  if (testInfo.project.name === 'desktop-chromium') await photo.click();
  else await photo.tap();
  await expect(close).toBeFocused();
  expect(await close.evaluate((button) => getComputedStyle(button).outlineStyle)).toBe('none');
  await close.click();

  await expect(photo).toBeFocused();
  await photo.press('Enter');
  await expect(dialog).toHaveAttribute('open', '');
  await expect(close).toBeFocused();
  expect(await close.evaluate((button) => button.matches(':focus-visible'))).toBe(true);
  expect(await close.evaluate((button) => getComputedStyle(button).outlineStyle)).not.toBe('none');
});

test('lightbox controls never overlap the photo bounds', async ({ page }, testInfo) => {
  const viewports =
    testInfo.project.name === 'desktop-chromium'
      ? [{ width: 1440, height: 900 }]
      : [
          { width: 393, height: 661 },
          { width: 390, height: 844 },
          { width: 390, height: 664 },
        ];

  await page.goto('/photography/');
  const photoIndices = await findLightboxPhotoExamples(page);
  expect(photoIndices.every((index) => index >= 0)).toBe(true);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const index of photoIndices) {
      await page.locator('[data-portfolio-photo]').nth(index).click();
      const dialog = page.locator('[data-portfolio-dialog]');
      await expect(dialog).toHaveAttribute('open', '');
      const overlaps = await dialog.evaluate((element) => {
        const activeDot = element.querySelector('.portfolio-dot[aria-current="true"]');
        const image = element.querySelector(
          `.portfolio-slide[data-photo-index="${activeDot?.dataset.index}"] img`,
        );
        if (!image) return ['missing active image'];
        const photo = image.getBoundingClientRect();
        return Array.from(
          element.querySelectorAll(
            '[data-portfolio-close], [data-portfolio-prev], [data-portfolio-next], [data-portfolio-pagination], [data-portfolio-project], [data-portfolio-retry]',
          ),
        )
          .filter((control) => !control.hidden && control.getClientRects().length > 0)
          .filter((control) => {
            const bounds = control.getBoundingClientRect();
            return (
              bounds.width > 0 &&
              bounds.height > 0 &&
              bounds.left < photo.right &&
              bounds.right > photo.left &&
              bounds.top < photo.bottom &&
              bounds.bottom > photo.top
            );
          })
          .map((control) => control.getAttribute('aria-label') || control.textContent.trim());
      });
      expect(overlaps).toEqual([]);
      await dialog.locator('[data-portfolio-close]').click();
      await expect(dialog).not.toHaveAttribute('open', '');
    }
  }
});
