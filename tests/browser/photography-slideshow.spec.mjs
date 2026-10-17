import { expect, test } from '@playwright/test';

test('the shared Photography slideshow announces photographs and keeps its project label', async ({
  page,
}) => {
  await page.goto('/photography/');

  await page.evaluate(async () => {
    const source = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"></svg>')}`;
    const slides = [
      {
        src: source,
        alt: 'Wat Arun temple',
        caption: 'Wat Arun',
        project: '20260801-late-night-drive-short-film-day-01',
        width: 4,
        height: 3,
      },
      {
        src: source,
        alt: 'Ha Giang mountains',
        caption: 'Ha Giang Loop',
        project: '20260526-ha-giang-loop',
        width: 4,
        height: 3,
      },
    ];
    const root = document.createElement('section');
    root.dataset.testPhotographyViewer = '';
    root.dataset.slideshow = '';
    root.dataset.slideNoun = 'photograph';
    root.dataset.slides = JSON.stringify(slides);
    root.innerHTML = `
      <div data-photo-panel>
        <div data-photo-viewport><img data-slide-image src="${source}" alt="Wat Arun temple" width="4" height="3"></div>
        <button type="button" data-slide-prev>Previous</button>
        <button type="button" data-slide-next>Next</button>
        <p data-slide-caption>Wat Arun</p>
        <a data-photo-project href="/photography/20260801-late-night-drive-short-film-day-01/">View project →</a>
        <span data-slide-count>01 / 02</span>
        <div data-photo-filmstrip>
          <button type="button" data-photo-index="0" tabindex="0"></button>
          <button type="button" data-photo-index="1" tabindex="-1"></button>
        </div>
        <p data-photo-status role="status" aria-live="polite"></p>
      </div>`;
    document.body.append(root);

    const status = root.querySelector('[data-photo-status]');
    window.photographyAnnouncements = [];
    new MutationObserver(() => window.photographyAnnouncements.push(status.textContent)).observe(
      status,
      { childList: true, characterData: true, subtree: true },
    );

    const { setupPhotographyViewer } = await import('/src/scripts/photography-viewer.ts');
    setupPhotographyViewer(root);
  });

  const slideshow = page.locator('[data-test-photography-viewer]');
  const projectLink = slideshow.locator('[data-photo-project]');
  await expect(projectLink).toHaveText('View project →');
  await expect(projectLink).toHaveAttribute('href', '/photography/20260801-late-night-drive-short-film-day-01/');

  await slideshow.locator('[data-slide-next]').click();
  await expect
    .poll(() => page.evaluate(() => window.photographyAnnouncements))
    .toContain('Loading photograph 2 of 2.');
  await expect(slideshow).toHaveAttribute('data-index', '1');
  await expect(slideshow.locator('[data-slide-caption]')).toHaveText('Ha Giang Loop');
  await expect(projectLink).toHaveText('View project →');
  await expect(projectLink).toHaveAttribute('href', '/photography/20260526-ha-giang-loop/');
});
