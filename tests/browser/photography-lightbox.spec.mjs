import { expect, test } from '@playwright/test';

async function findLightboxPhotoExamples(page) {
  return page.locator('[data-portfolio-photo]:not([hidden])').evaluateAll((photos) => {
    return [...new Set([0, Math.floor(photos.length / 2), photos.length - 1])];
  });
}

async function addTemporaryProjectLink(page) {
  await page
    .locator('[data-portfolio-photo]')
    .first()
    .evaluate((photo) => {
      photo.dataset.projectUrl = '/photography/20260809-late-night-drive-bts/';
    });
  await page.locator('[data-portfolio-controls]').evaluate((controls) => {
    controls.dataset.hasProjectLinks = 'true';
  });
}

test('opening a photo renders a visible active carousel dot', async ({ page }) => {
  await page.goto('/photography/');
  await page.locator('[data-portfolio-photo]').first().click();

  const dialog = page.locator('[data-portfolio-dialog]');
  await expect(dialog).toHaveAttribute('open', '');
  const dots = dialog.locator('[data-portfolio-dots] .portfolio-dot');
  expect(await dots.count()).toBeGreaterThan(0);
  const hitAreas = await dots.evaluateAll((items) =>
    items.map((dot) => {
      const { width, height } = dot.getBoundingClientRect();
      return { width, height };
    }),
  );
  expect(hitAreas.every(({ width, height }) => width >= 24 && height >= 24)).toBe(true);

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
  expect(activeStyle.width).toBeGreaterThanOrEqual(24);
  expect(activeStyle.height).toBeGreaterThanOrEqual(24);
  expect(activeStyle.opacity).toBeGreaterThan(0);
  expect(activeStyle.position).toBe('absolute');
  await expect(activeDot).toHaveAttribute('aria-label', 'Photo 1 of 4');
  await dots.nth(1).click();
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'data-index',
    '1',
  );
});

test('arrow keys clamp at both ends and Escape restores focus to the opener', async ({ page }) => {
  await page.goto('/photography/');
  const photos = page.locator('[data-portfolio-photo]');
  const dialog = page.locator('[data-portfolio-dialog]');

  for (const [index, edgeKey, inwardKey, inwardIndex] of [
    [0, 'ArrowLeft', 'ArrowRight', 1],
    [3, 'ArrowRight', 'ArrowLeft', 2],
  ]) {
    const opener = photos.nth(index);
    await opener.click();
    await page.keyboard.press(edgeKey);
    await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
      'data-index',
      String(index),
    );
    await page.keyboard.press(inwardKey);
    await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
      'data-index',
      String(inwardIndex),
    );
    await page.keyboard.press('Escape');
    await expect(dialog).not.toHaveAttribute('open', '');
    await expect(opener).toBeFocused();
  }
});

test('touch emulation hides arrows and keeps the dots tappable', async ({ page }, testInfo) => {
  await page.goto('/photography/');
  await page.locator('[data-portfolio-photo]').nth(1).click();
  const dialog = page.locator('[data-portfolio-dialog]');
  const touchMedia = await page.evaluate(
    () => matchMedia('(hover: none) and (pointer: coarse)').matches,
  );
  expect(touchMedia).toBe(testInfo.project.name !== 'desktop-chromium');
  if (touchMedia) {
    await expect(dialog.locator('[data-portfolio-prev]')).toBeHidden();
    await expect(dialog.locator('[data-portfolio-next]')).toBeHidden();
  } else {
    await expect(dialog.locator('[data-portfolio-prev]')).toBeVisible();
    await expect(dialog.locator('[data-portfolio-next]')).toBeVisible();
  }
  const activeDot = dialog.locator('.portfolio-dot[aria-current="true"]');
  await expect(activeDot).toHaveAttribute('aria-label', 'Photo 2 of 4');
  const bounds = await activeDot.boundingBox();
  expect(bounds?.width).toBeGreaterThanOrEqual(24);
  expect(bounds?.height).toBeGreaterThanOrEqual(24);
  await dialog.locator('[data-portfolio-close]').click();
});

test('a 40-photo lightbox keeps the full dot count and active window in sync', async ({ page }) => {
  await page.goto('/photography/');
  const fixtureId = 'lightbox-forty-photo-fixture';
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

  const root = page.locator(`#${fixtureId}`);
  const more = root.locator('[data-portfolio-more]');
  while (!(await more.evaluate((button) => button.hidden)))
    await more.evaluate((button) => button.click());
  const opener = root.locator('[data-portfolio-photo]').first();
  await opener.click();
  const dialog = root.locator('[data-portfolio-dialog]');
  const dots = dialog.locator('.portfolio-dot');
  await expect(dots).toHaveCount(40);
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'aria-label',
    'Photo 1 of 40',
  );
  for (let index = 0; index < 20; index++) await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'aria-label',
    'Photo 21 of 40',
  );
  await expect(dialog.locator('.portfolio-dot[aria-hidden="true"]')).toHaveCount(35);
  for (let index = 20; index < 39; index++) await page.keyboard.press('ArrowRight');
  await expect(dialog.locator('.portfolio-dot[aria-current="true"]')).toHaveAttribute(
    'aria-label',
    'Photo 40 of 40',
  );
  await expect(dots).toHaveCount(40);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
  await expect(opener).toBeFocused();
});

test('photo stage fills the viewport above a stable bottom control group', async ({
  page,
}, testInfo) => {
  await page.goto('/photography/');
  await addTemporaryProjectLink(page);
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
          imageBoxBottomToDot: (() => {
            const dot = activeDot.getBoundingClientRect();
            const marker = getComputedStyle(activeDot, '::before');
            const markerHeight = Number.parseFloat(marker.height);
            const markerScale = Number.parseFloat(activeDot.style.getPropertyValue('--dot-scale'));
            return (
              dot.top +
              (dot.height - markerHeight * markerScale) / 2 -
              image.getBoundingClientRect().bottom
            );
          })(),
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
      if (hasProjectLink) expect(layout.dots.bottom).toBeLessThan(layout.link.top);
      else expect(layout.dots.bottom).toBeLessThanOrEqual(layout.projectSlot.top);
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
  await expect(dialog.locator('[data-portfolio-feedback]')).toHaveText('', { timeout: 30_000 });
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
  await expect(dialog.locator('[data-portfolio-feedback]')).toHaveText('', { timeout: 30_000 });
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

test('project links follow the current photo data', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 661 });
  await page.goto('/photography/');
  await addTemporaryProjectLink(page);
  const photos = await page
    .locator('[data-portfolio-photo]:not([hidden])')
    .evaluateAll((items) =>
      items.map((photo, index) => ({ index, linked: Boolean(photo.dataset.projectUrl) })),
    );
  const unlinkedIndex = photos.find((photo) => !photo.linked)?.index;
  const linkedIndex = photos.find((photo) => photo.linked)?.index;
  await expect(page.locator('[data-portfolio-controls]')).toHaveAttribute(
    'data-has-project-links',
    String(linkedIndex !== undefined),
  );

  const measureSlot = async () =>
    page.locator('.portfolio-project-slot').evaluate((slot) => {
      const bounds = slot.getBoundingClientRect();
      return { top: bounds.top, height: bounds.height };
    });
  const dialog = page.locator('[data-portfolio-dialog]');
  const slots = [];
  for (const sample of [
    unlinkedIndex === undefined ? undefined : { index: unlinkedIndex, linked: false },
    linkedIndex === undefined ? undefined : { index: linkedIndex, linked: true },
  ].filter(Boolean)) {
    await page.locator('[data-portfolio-photo]').nth(sample.index).click();
    const project = dialog.locator('[data-portfolio-project]');
    if (sample.linked) await expect(project).toBeVisible();
    else await expect(project).toBeHidden();
    slots.push(await measureSlot());
    await dialog.locator('[data-portfolio-close]').click();
  }
  if (slots.length === 2) {
    expect(slots[0].height).toBe(44);
    expect(slots[0].top).toBeCloseTo(slots[1].top, 0);
  }
});

test('the Close focus ring follows keyboard focus, not pointer opening', async ({
  page,
}, testInfo) => {
  await page.goto('/photography/');
  const [firstPhotoIndex] = await findLightboxPhotoExamples(page);
  const photo = page.locator('[data-portfolio-photo]').nth(firstPhotoIndex);
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
