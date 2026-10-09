// ==========================================
// 📱 CHAPTER NAVIGATION & SCREEN SIZE TESTER (scripts/check-chapter-navigation.mjs)
// ==========================================
// This script opens an automated browser (Playwright) and tests your blog
// across 4 screen sizes (Desktop, Laptop, Tablet, Mobile Phone):
// 1. Checks that the chapter menu is a sidebar on computers and a popup drawer on phones.
// 2. Checks that the reading progress bar fills smoothly as you scroll.
// 3. Guarantees that text never spills off the edge of mobile screens!

// Test chapter navigation and reading progress at multiple viewport widths.
// --- BORROWED TOOLS (Imports) ---
// assert: Node.js strict assertion library.
import assert from 'node:assert/strict';
// chromium: Playwright automated headless browser to test responsiveness.
import { chromium } from '@playwright/test';

const url = process.env.PREVIEW_URL || 'http://127.0.0.1:4321/blog/reading-progress-preview/';
const browser = await chromium.launch({ headless: true });

try {
  for (const width of [1440, 1024, 768, 375]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route(url, async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        '<h2 id="choosing-a-rhythm">',
        '<h2 id="check-tldr">TL;DR</h2><p>Short summary.</p><h3 id="check-tldr-nested">Nested detail</h3><p>Nested content.</p><h4 id="check-tldr-deeper">Deeper detail</h4><p>More content.</p><h2 id="choosing-a-rhythm">',
      );
      const nestedHtml = html.replaceAll(
        '<a href="#choosing-a-rhythm">Choosing a rhythm</a></li>',
        '<a href="#choosing-a-rhythm">Choosing a rhythm</a></li><li style="padding-left: 0px"><a href="#check-tldr">TL;DR</a></li>',
      );
      await route.fulfill({ response, body: nestedHtml });
    });
    await page.goto(url);
    const initial = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      bodyWidth: document.querySelector('[data-article-body]').getBoundingClientRect().width,
      desktop: getComputedStyle(document.querySelector('.chapter-nav-desktop')).display,
      mobile: getComputedStyle(document.querySelector('.chapter-nav-mobile')).display,
      mobileOpen: document.querySelector('.chapter-nav-mobile').open,
      tldrClosed: !document.querySelector('#check-tldr').closest('details').open,
      ordinarySectionOpen: document.querySelector('#finding-the-story').closest('details').open,
      nestedSection: document.querySelector('#check-tldr-nested').closest('details').parentElement
        .closest('details')?.querySelector('summary')?.textContent.includes('TL;DR'),
      chapterLevels: [...document.querySelectorAll('.chapter-nav')].map((nav) => [...nav.querySelectorAll('a[href="#preparing-a-sequence"], a[href="#checking-the-cut"]')].map((link) => ({
        href: link.getAttribute('href'),
        indent: parseFloat(getComputedStyle(link.closest('li')).paddingLeft),
      }))),
      followingSectionOutside: !document.querySelector('#choosing-a-rhythm').closest('details')
        .parentElement.closest('details'),
      labelLeft: document.querySelector('.chapter-label').getBoundingClientRect().left,
      articleLeft: document.querySelector('[data-article-body]').getBoundingClientRect().left,
      targetsExist: [...document.querySelectorAll('.chapter-nav a')].every((link) =>
        document.querySelector(decodeURIComponent(link.getAttribute('href'))),
      ),
      progress: getComputedStyle(document.querySelector('[data-reading-progress]')).transform,
    }));
    assert.equal(initial.overflow, false, `${width}px has horizontal overflow`);
    assert.equal(initial.targetsExist, true, 'chapter links should point to rendered headings');
    assert.equal(initial.tldrClosed, true, 'TL;DR should start collapsed');
    assert.equal(initial.ordinarySectionOpen, true, 'ordinary sections should start expanded');
    assert.equal(initial.nestedSection, true, 'deeper headings should nest under their section');
    assert.deepEqual(initial.chapterLevels, Array.from({ length: 2 }, () => [
      { href: '#preparing-a-sequence', indent: 12 },
      { href: '#checking-the-cut', indent: 24 },
    ]), 'both menus should render actual h3 and h4 sections with increasing indentation');
    assert.equal(initial.followingSectionOutside, true, 'same-level headings should remain siblings');
    assert.equal(initial.progress, 'matrix(0, 0, 0, 1, 0, 0)', 'progress should start empty');
    assert.equal(initial.desktop === 'block', width >= 1200);
    assert.equal(initial.mobile === 'block', width < 1200);
    if (width >= 1200) assert.equal(initial.bodyWidth, 700);
    if (width < 1200) {
      assert.equal(initial.mobileOpen, false);
      assert.ok(
        Math.abs(initial.labelLeft - initial.articleLeft) < 1,
        `${width}px chapter label should align with article text`,
      );
    }
    await page.evaluate(() => {
      location.hash = '#check-tldr-nested';
    });
    await page.waitForFunction(() => document.querySelector('#check-tldr').closest('details').open);

    if (width < 1200) await page.locator('.chapter-nav-mobile summary').click();
    const nav = width >= 1200 ? '.chapter-nav-desktop' : '.chapter-nav-mobile';
    await page.evaluate(() => {
      document.querySelector('#choosing-a-rhythm').closest('details').open = false;
      document.querySelector('#choosing-a-rhythm').scrollIntoView();
    });
    await page.locator(`${nav} a[href="#checking-the-cut"]`).click();
    await page.waitForFunction(() => location.hash === '#checking-the-cut');
    await page.waitForTimeout(100);
    const nestedJump = await page.evaluate(() => ({
      targetTop: document.querySelector('#checking-the-cut').getBoundingClientRect().top,
      parentOpen: document.querySelector('#choosing-a-rhythm').closest('details').open,
      childOpen: document.querySelector('#preparing-a-sequence').closest('details').open,
    }));
    assert.equal(nestedJump.parentOpen, true, 'deep chapter links should open collapsed ancestors');
    assert.equal(nestedJump.childOpen, true, 'deep chapter links should open nested ancestors');
    if (width < 1200) assert.ok(nestedJump.targetTop > 72, 'mobile menu should not cover the target');
    await page.evaluate(() => {
      document.querySelector('#preparing-a-sequence').closest('details').open = false;
      document.querySelector('#choosing-a-rhythm').closest('details').open = false;
      const heading = document.querySelector('#choosing-a-rhythm');
      window.scrollBy(0, heading.getBoundingClientRect().top - 150);
    });
    await page.waitForTimeout(500);
    const activeAfterCollapse = await page.locator(`${nav} a[aria-current="location"]`).getAttribute('href');
    const collapsedState = await page.evaluate(() => ['choosing-a-rhythm', 'preparing-a-sequence', 'checking-the-cut'].map((id) => ({
      id,
      rects: document.querySelector(`#${id}`).getClientRects().length,
      top: document.querySelector(`#${id}`).getBoundingClientRect().top,
      open: document.querySelector(`#${id}`).closest('details').open,
    })));
    assert.equal(activeAfterCollapse, '#choosing-a-rhythm', `visible parent should stay active after collapse (got ${activeAfterCollapse}; ${JSON.stringify(collapsedState)})`);
    assert.equal(
      await page.locator(`${nav} a[href="#preparing-a-sequence"]`).evaluate((link) => link.hasAttribute('aria-current')),
      false,
      'hidden child headings should not remain active when their parent is collapsed',
    );
    await page.evaluate(() => {
      document.querySelector('#check-tldr').closest('details').open = true;
    });
    if (width < 1200) await page.locator('.chapter-nav-mobile summary').click();
    await page.locator(`${nav} a[href="#leaving-room-for-sound"]`).click();
    await page.waitForTimeout(1100);
    const jumped = await page.evaluate((nav) => {
      const heading = document.querySelector(decodeURIComponent(location.hash));
      const activeLinks = document.querySelectorAll(`${nav} a[aria-current="location"]`);
      const mobileSummary = document.querySelector('.chapter-nav-mobile summary');
      return {
        hash: location.hash,
        headingTop: heading?.getBoundingClientRect().top,
        menuBottom: mobileSummary?.getBoundingClientRect().bottom,
        menuTop: mobileSummary?.getBoundingClientRect().top,
        active: [...activeLinks].map((link) => link.getAttribute('href')),
        progress: getComputedStyle(document.querySelector('[data-reading-progress]')).transform,
      };
    }, nav);
    assert.equal(jumped.hash, '#leaving-room-for-sound');
    if (width >= 1200) {
      assert.ok(
        Math.abs(jumped.headingTop - 24) < 2,
        `${width}px heading offset: ${jumped.headingTop}`,
      );
      await page.evaluate(() => document.querySelector('#reaching-the-end').scrollIntoView());
      assert.ok(
        Math.abs(
          (await page
            .locator('.chapter-nav-desktop')
            .evaluate((el) => el.getBoundingClientRect().top)) - 24,
        ) < 2,
      );
    } else {
      assert.ok(
        jumped.headingTop > jumped.menuBottom,
        'sticky summary should not cover the target heading',
      );
      assert.ok(
        Math.abs(jumped.menuTop) < 2,
        'collapsed chapter control should stick flush with viewport top',
      );
      assert.equal(await page.locator('.chapter-nav-mobile').evaluate((el) => el.open), false);
      await page.evaluate(() => document.querySelector('#reaching-the-end').scrollIntoView());
      await page.waitForTimeout(1100);
      assert.ok(
        Math.abs(
          await page
            .locator('.chapter-nav-mobile summary')
            .evaluate((el) => el.getBoundingClientRect().top),
        ) < 2,
        'chapter control should remain available near article end',
      );
      const beforeOpen = await page.evaluate(() => ({
        scrollY,
        bodyTop: document.querySelector('[data-article-body]').getBoundingClientRect().top,
        bodyBottom: document.querySelector('[data-article-body]').getBoundingClientRect().bottom,
        menuHeight: document.querySelector('.chapter-nav-mobile').getBoundingClientRect().height,
        progress: getComputedStyle(document.querySelector('[data-reading-progress]')).transform,
      }));
      const summaryBox = await page.locator('.chapter-nav-mobile summary').boundingBox();
      await page.mouse.click(
        summaryBox.x + summaryBox.width / 2,
        summaryBox.y + summaryBox.height / 2,
      );
      await page.waitForFunction(() => {
        const menu = document.querySelector('.chapter-nav-mobile');
        return menu.open && !document.querySelector('[data-chapter-dimmer]').hidden;
      });
      const menu = await page.locator('.chapter-nav-mobile').evaluate((el) => ({
        height: el.getBoundingClientRect().height,
        summaryTop: el.querySelector('summary').getBoundingClientRect().top,
        zIndex: Number(getComputedStyle(el).zIndex),
        panelDisplay: getComputedStyle(el.querySelector('nav')).display,
        labelLeft: el.querySelector('.chapter-label').getBoundingClientRect().left,
        listLeft: el.querySelector('nav ol').getBoundingClientRect().left,
        panel: {
          height: el.querySelector('nav').getBoundingClientRect().height,
          maxHeight: parseFloat(getComputedStyle(el.querySelector('nav')).maxHeight),
          overflowY: getComputedStyle(el.querySelector('nav')).overflowY,
        },
      }));
      const afterOpen = await page.evaluate(() => ({
        scrollY,
        bodyTop: document.querySelector('[data-article-body]').getBoundingClientRect().top,
        bodyBottom: document.querySelector('[data-article-body]').getBoundingClientRect().bottom,
        menuHeight: document.querySelector('.chapter-nav-mobile').getBoundingClientRect().height,
        progress: getComputedStyle(document.querySelector('[data-reading-progress]')).transform,
        dimmerZ: Number(getComputedStyle(document.querySelector('[data-chapter-dimmer]')).zIndex),
        progressZ: Number(getComputedStyle(document.querySelector('.reading-progress')).zIndex),
        overflow: document.documentElement.scrollWidth > innerWidth,
        dimmerBackground: getComputedStyle(document.querySelector('[data-chapter-dimmer]'))
          .backgroundColor,
      }));
      assert.equal(
        menu.height,
        beforeOpen.menuHeight,
        'opening menu must preserve its flow footprint',
      );
      assert.ok(menu.panel.height <= page.viewportSize().height - 72);
      assert.equal(menu.panel.overflowY, 'auto');
      assert.ok(
        Math.abs(menu.summaryTop) < 2,
        `summary should be flush with viewport top (${menu.summaryTop})`,
      );
      const articleLeft = await page
        .locator('[data-article-body]')
        .evaluate((el) => el.getBoundingClientRect().left);
      assert.ok(Math.abs(menu.labelLeft - articleLeft) < 1);
      assert.ok(Math.abs(menu.listLeft - articleLeft) < 1);
      assert.notEqual(menu.panelDisplay, 'none');
      assert.equal(menu.zIndex > afterOpen.dimmerZ, true);
      assert.equal(afterOpen.progressZ > menu.zIndex, true);
      assert.equal(afterOpen.overflow, false);
      assert.notEqual(afterOpen.dimmerBackground, 'rgba(0, 0, 0, 0)');
      assert.deepEqual(
        {
          scrollY: afterOpen.scrollY,
          bodyTop: afterOpen.bodyTop,
          bodyBottom: afterOpen.bodyBottom,
          menuHeight: afterOpen.menuHeight,
          progress: afterOpen.progress,
        },
        beforeOpen,
        'opening menu must not shift the page or reading progress',
      );
      if (width === 1024) {
        await page.setViewportSize({ width: 1440, height: 900 });
        assert.equal(
          await page
            .locator('[data-chapter-dimmer]')
            .evaluate((el) => getComputedStyle(el).display),
          'none',
          'mobile dimmer must not intercept the desktop layout after resizing',
        );
        assert.equal(
          await page.locator('.chapter-nav-desktop').evaluate((el) => getComputedStyle(el).display),
          'block',
        );
        await page.setViewportSize({ width: 1024, height: 900 });
      }
      if (width === 375) {
        const list = await page.locator('.chapter-nav-mobile ol').evaluate((el) => {
          for (let index = 0; index < 30; index++) {
            const item = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#reaching-the-end';
            link.textContent = `Sample chapter ${index + 1}`;
            item.append(link);
            el.append(item);
          }
          const menu = el.closest('nav');
          menu.scrollTop = 200;
          return {
            scrollable: menu.scrollHeight > menu.clientHeight,
            summaryTop: menu.closest('details').querySelector('summary').getBoundingClientRect()
              .top,
          };
        });
        assert.equal(list.scrollable, true, 'long chapter lists should scroll inside the menu');
        assert.ok(Math.abs(list.summaryTop) < 2, 'expanded menu summary should stay visible');
        const afterMenuScroll = await page.evaluate(() => ({
          scrollY,
          bodyTop: document.querySelector('[data-article-body]').getBoundingClientRect().top,
          bodyBottom: document.querySelector('[data-article-body]').getBoundingClientRect().bottom,
          menuHeight: document.querySelector('.chapter-nav-mobile').getBoundingClientRect().height,
          progress: getComputedStyle(document.querySelector('[data-reading-progress]')).transform,
        }));
        assert.deepEqual(
          afterMenuScroll,
          beforeOpen,
          'internal menu scrolling must not move the article',
        );
        await page.locator('.chapter-nav-mobile nav').evaluate((el) => (el.scrollTop = 0));
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => {
          const menu = document.querySelector('.chapter-nav-mobile');
          return !menu.open && document.querySelector('[data-chapter-dimmer]').hidden;
        });
        assert.equal(
          await page.evaluate(
            () => document.activeElement === document.querySelector('.chapter-nav-mobile summary'),
          ),
          true,
          'Escape should return focus to the summary',
        );
        await page.locator('.chapter-nav-mobile summary').click();
      } else {
        await page.locator('[data-chapter-dimmer]').click();
        await page.waitForFunction(() => {
          const menu = document.querySelector('.chapter-nav-mobile');
          return !menu.open && document.querySelector('[data-chapter-dimmer]').hidden;
        });
        assert.equal(
          await page.evaluate(
            () => document.activeElement === document.querySelector('.chapter-nav-mobile summary'),
          ),
          true,
          'backdrop dismissal should return focus to the summary',
        );
        await page.locator('.chapter-nav-mobile summary').click();
      }
      await page.locator('.chapter-nav-mobile a[href="#finding-the-story"]').click();
      await page.waitForTimeout(1100);
      assert.equal(await page.locator('.chapter-nav-mobile').evaluate((el) => el.open), false);
      const firstHeadingTop = await page
        .locator('#finding-the-story')
        .evaluate((el) => el.getBoundingClientRect().top);
      assert.ok(
        firstHeadingTop > 65,
        `selected heading should clear the sticky chapter control (top ${firstHeadingTop})`,
      );
      await page
        .locator('#leaving-room-for-sound')
        .evaluate((el) => el.closest('details').querySelector(':scope > p').scrollIntoView());
      await page.locator('.chapter-nav-mobile summary').click();
      await page.locator('.chapter-nav-mobile a[href="#leaving-room-for-sound"]').click();
      await page.waitForTimeout(300);
      const repeatedJump = await page.evaluate(() => ({
        hash: location.hash,
        headingTop: document.querySelector('#leaving-room-for-sound').getBoundingClientRect().top,
        open: document.querySelector('.chapter-nav-mobile').open,
      }));
      assert.equal(repeatedJump.hash, '#leaving-room-for-sound');
      assert.equal(repeatedJump.open, false);
      assert.ok(
        Math.abs(repeatedJump.headingTop - 96) < 2,
        `repeated chapter selection should return to the heading (top ${repeatedJump.headingTop})`,
      );
    }
    assert.deepEqual(jumped.active, ['#leaving-room-for-sound']);
    assert.notEqual(jumped.progress, initial.progress);

    if (width === 1440) {
      await page.reload();
      await page.evaluate(() => {
        const heading = document.querySelector('[data-article-body] h2');
        const oldId = heading.id;
        heading.id = 'élan';
        document.querySelectorAll('.chapter-nav a').forEach((link) => {
          if (link.getAttribute('href') === `#${oldId}`) link.setAttribute('href', '#élan');
        });
      });
      await page.locator('.chapter-nav-desktop a').first().click();
      await page.waitForTimeout(1100);
      const unicodeResult = await page.evaluate(() => ({
        hash: location.hash,
        active: document
          .querySelector('.chapter-nav-desktop a[aria-current="location"]')
          ?.getAttribute('href'),
      }));
      assert.equal(unicodeResult.hash, '#%C3%A9lan');
      assert.equal(
        unicodeResult.active,
        '#élan',
        'active state should handle encoded Unicode hashes',
      );
    }
    await page.close();
  }

  const noScriptPage = await browser.newPage({
    viewport: { width: 375, height: 812 },
    javaScriptEnabled: false,
  });
  await noScriptPage.emulateMedia({ reducedMotion: 'reduce' });
  await noScriptPage.goto(url);
  await noScriptPage.locator('.chapter-nav-mobile summary').click();
  await noScriptPage.locator('.chapter-nav-mobile a[href="#leaving-room-for-sound"]').click();
  assert.equal(new URL(noScriptPage.url()).hash, '#leaving-room-for-sound');
  await noScriptPage.close();

  for (const width of [1440, 1024, 768, 375]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url);
    if (width === 1440) {
      const bodyTop = await page
        .locator('[data-article-body]')
        .evaluate((el) => el.getBoundingClientRect().top + scrollY);
      await page.evaluate((y) => scrollTo(0, y - 24), bodyTop);
      await page.waitForTimeout(250);
      await page.screenshot({ path: '/private/tmp/chapter-nav-desktop.png' });
    } else {
      await page.locator('.chapter-nav-mobile summary').click();
      await page
        .locator('.chapter-nav-mobile summary')
        .evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await page.evaluate(() => scrollBy(0, 48));
      await page.waitForTimeout(250);
      assert.ok(
        Math.abs(
          await page
            .locator('.chapter-nav-mobile summary')
            .evaluate((el) => el.getBoundingClientRect().top),
        ) < 2,
      );
      const screenshot = width === 375 ? 'phone' : String(width);
      await page.screenshot({ path: `/private/tmp/chapter-nav-${screenshot}.png` });
    }
    await page.close();
  }
  console.log(
    'Chapter navigation passed at desktop, intermediate, and phone widths, including native no-JavaScript links.',
  );
} finally {
  await browser.close();
}
