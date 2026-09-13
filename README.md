# Neil Tayler — writing & photography

A static, Markdown-driven Astro website for GitHub Pages. The blog is the homepage; photography, about and contact have their own pages. `/blog/` redirects to `/`. No CMS, database, analytics or paid service is required.

## Local development

Use Node.js 24 LTS and npm. From the repository root:

```sh
npm ci
npm run dev -- --background
```

Open the URL printed by Astro (normally `http://127.0.0.1:4321`). Manage the background server with `npx astro dev status`, `npx astro dev logs`, and `npx astro dev stop`. If telemetry cannot write to your Windows profile, set `$env:ASTRO_TELEMETRY_DISABLED='1'` in PowerShell before running Astro.

```sh
npm run check
npm test
npm run build
npm run verify
npm run preview -- --port 4322
```

`check` validates Astro and TypeScript; tests cover feed sorting, dates, category keys and excerpts. `verify` inspects the production output for broken local links, image variants, fragments, metadata, RSS, sitemap and leaked drafts. Preview the production build at the URL Astro prints. Use `npx astro preview stop` to stop it.

## Personalise first

- `src/config/site.ts`: name, author, description, tagline, social preview image, real email and external profile URLs. Empty contact values remain clearly labelled, without dummy links.
- `src/data/about.ts`: biography, interests and optional portrait. Replace the example text with your own account.
- `src/data/featured.ts`: the single curated photography slideshow list.
- `src/styles/global.css`: typography, spacing, colours and responsive layouts. It uses plain CSS, not Tailwind.

Published example posts and projects have `demo: true` and visibly identify themselves as samples. Replace their copy and photographs before removing that flag. Older proof-of-concept entries are retained as drafts; review their text and image paths before publishing them. Sample photographs are not represented as Neil's work; provenance is in `public/images/demo/SOURCES.md`.

## Publish a blog post

Create `src/content/blog/my-post.md`. Its filename becomes `/blog/my-post/`. Markdown and MDX are supported; ordinary Markdown is sufficient.

```yaml
---
title: 'A title for the post'
subtitle: 'An optional second line'
date: 2026-09-13
category: 'Photography'
image: '/images/my-post.jpg'
imageAlt: 'Describe what the photograph shows'
draft: false
demo: false
---
Write the post here.
```

`title`, `date` and `category` are required. Omit `subtitle`, `image` and `imageAlt` when unused. Image-free posts have no empty image column. An optional `excerpt` overrides the automatically extracted body excerpt. Use `draft: true` to exclude the post from the site, RSS and sitemap. A future date does not schedule publication: use drafts until ready.

Categories are derived from published content, so adding a new category requires no code change. Both indexes support category filtering and newest/oldest sorting; selections are reflected in the URL and browser history. Dates display as YYYY-MM-DD.

Use Markdown headings starting at `##`, links, lists, blockquotes, fenced code blocks and tables. For a captioned body photograph, use semantic HTML:

```html
<figure>
  <img
    src="/images/example.jpg"
    alt="A meaningful description"
    width="1600"
    height="1067"
    loading="lazy"
    decoding="async"
  />
  <figcaption>An optional caption.</figcaption>
</figure>
```

Ordinary Markdown body images are served as supplied. Export these at an appropriate size; automatic responsive variants are used by the site's image components for cards, heroes, galleries and the slideshow.

## Publish a photography project

Create `src/content/photography/my-project.md`:

```yaml
---
title: 'My project'
subtitle: 'An optional introduction'
date: 2026-09-13
category: 'Landscape'
cover: '/images/my-project/landscape.jpg'
coverAlt: 'Description of the cover photograph'
draft: false
demo: false
images:
  - src: '/images/my-project/landscape.jpg'
    alt: 'A valley beneath low cloud'
    width: 1600
    height: 1067
    caption: 'Optional caption'
  - src: '/images/my-project/portrait.jpg'
    alt: 'A tree against an open sky'
    width: 1000
    height: 1500
---
Optional project notes go here.
```

Published projects require a cover and at least one gallery image. Gallery image descriptions and positive dimensions are required. Use each original's real pixel dimensions, including portrait orientation. The gallery preserves image proportions and opens a keyboard-accessible lightbox. Arrow keys move through images, Escape closes, Tab stays inside the dialog, and focus returns to the opened photograph. Horizontal swipe is also implemented.

## Curate the slideshow

Edit only `src/data/featured.ts`. Each entry has `src`, `alt`, `width`, `height`, optional `caption`, and optional `project` containing a project filename without extension. Reorder entries to change their order; remove or add entries to change the selection. Set its demo flag to false when the selection contains your work. The slideshow is manual, with previous/next controls, arrow keys and horizontal swipe. It never autoplays.

## Images

Store originals in `public/images/` and reference them with `/images/...` URLs. Prefer descriptive lowercase filenames. Supply useful alt text, and export web-sized originals rather than camera RAW files. Keep photographs free of decorative filters.

`npm run images` reads local JPEG, PNG, WebP and AVIF files, corrects orientation and creates WebP variants at up to 480, 960 and 1440 pixels without enlarging them. It also generates the social card from its SVG source. This runs automatically before development, checking and building. Generated `public/_images/` and `src/generated/images.json` are ignored by Git and recreated in CI. After replacing an original, rerun the image command or restart development. The image components supply dimensions, responsive sources and lazy loading; priority images load eagerly.

## Design and accessibility

Charcoal is the first-visit theme regardless of operating-system preference. The header toggle switches to warm light mode and remembers the choice in localStorage. The early head script prevents a theme flash; storage failures fall back safely. The site uses system sans, serif and monospace fonts, visible keyboard focus, a skip link and reduced-motion styling. Without JavaScript the content and navigation remain usable; photographs open as normal image links, while interactive filter controls are hidden.

## GitHub Pages

The production origin is `https://neiltaylerfilm.github.io/`, configured in `astro.config.ts`. This is a root user site, so no repository base path is needed. RSS is `/rss.xml`, sitemap is `/sitemap-index.xml`, robots is `/robots.txt`, and the custom error page is `/404.html`.

In GitHub repository Settings → Pages, select **GitHub Actions** as the source. `.github/workflows/deploy.yml` runs on pushes to `main` and can be run manually. It installs the lockfile dependencies, checks types, runs tests, builds, verifies output and publishes `dist`. To publish reviewed changes, commit and push to `main`; local edits alone do not deploy. If moving to a different domain or project subpath, update Astro's origin/base configuration and the production origin used by the verification script, then check all root-relative asset URLs.

## Before publishing

1. Replace sample biography, contact details, posts and photographs; check demo labels and drafts.
2. Run `npm run format`, then check, test, build and verify as above.
3. Review the production preview at 320, 375, 430, 768, 1024 and 1440 pixels or wider. Check the homepage, an article, photography index, project, About, Contact and 404.
4. Test both themes, filter/sort combinations, browser Back, slideshow arrows, lightbox keyboard navigation and closing, plus touch interactions on a phone.
5. Confirm links, captions, image descriptions and social metadata before pushing.

## Project map

- `src/pages/`: routes, RSS and custom 404.
- `src/content/`: Markdown/MDX entries; schema in `src/content.config.ts`.
- `src/components/`: shared navigation, feeds, responsive images and photo interactions.
- `src/layouts/`: page shell, theme initialisation and shared metadata.
- `src/lib/`: content, feed and image utilities.
- `scripts/`: image preparation and production verification.
- `tests/`: feed utility tests.

No framework migration, runtime backend or third-party font service is involved. Keep `package-lock.json` with dependency changes so local and deployed builds stay reproducible.

## RSS and possible future popularity sorting

`src/pages/rss.xml.js` generates RSS from the same published posts used by the homepage. Each item includes its title, excerpt, category, date and canonical article link. Drafts are excluded. Readers subscribe to `/rss.xml` in their preferred feed reader; new items appear after you rebuild and deploy. There is no subscriber database or email delivery service.

Popularity sorting is intentionally absent because the site does not collect view counts. To add it later, first choose a real, privacy-conscious source of aggregate counts and define a time window. Fetch a snapshot during a scheduled build, join counts to stable article IDs, and add the comparator and UI option only when valid data is available. Keep credentials in GitHub Actions secrets, never in frontend code. Fall back to date sorting when counts are unavailable and document the counting method. Do not invent scores or add a popularity label to curated content.
