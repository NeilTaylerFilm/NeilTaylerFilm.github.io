# Neil Tayler Film

Photographs: [R2 upload and publishing guide](R2-PHOTOS.md). Use `npm run photos:check` to check access and `npm run photos:upload` to process the ignored `photo-inbox/` folder. Commit `src/data/r2-images.json`; never commit `.env.r2`. Builds merge the public R2 registry with local image metadata without needing credentials.

Start here: [Step-by-step publishing instructions](PUBLISHING.md). Demo content has been retired to `examples/retired-demo/` and is no longer published.

A static, content-first Astro blog with a secondary photography portfolio. The homepage is the blog archive; `/blog/` redirects there, and existing article/project URLs remain stable. Styling uses shared CSS tokens and small Astro components, with no client UI framework.

## Development and deployment

Use Node 24 (the GitHub Actions version) or a compatible Node version >=22.12.

```sh
npm ci
npm run dev           # Astro background server; prints its local URL
npm run dev:status
npm run dev:logs
npm run dev:stop
npm run check
npm test
npm run build
npm run verify
npm run preview -- --background
```

`npm run images` runs automatically before development, checking and building. After changing image source files while the dev server is running, run it again and restart the server. Generated derivatives and the image manifest are ignored by Git. Originals are retained locally; `postbuild` removes originals from `dist/images`, retaining the social card. Deploy the final `dist/` produced by **npm run build**, not a direct `astro build` invocation.

The workflow in `.github/workflows/deploy.yml` installs from the lockfile, checks types, runs unit tests, builds and validates links/metadata/drafts before uploading the static output. Pushes to `main` deploy to GitHub Pages. The repository's Pages source must be **GitHub Actions**. No deployment is triggered by local edits alone.

## Blog authoring

Add a `.md` (or `.mdx`) file to `src/content/blog/`. Its filename determines `/blog/filename/`; keep filenames stable after publishing.

```yaml
---
title: A new post
date: 2026-09-14
categories:
  - Post-production
description: A concise search and social description.
excerpt: A short, optional card excerpt; one or two sentences.
# subtitle: Optional subtitle
# updated: 2026-09-20
# image: /assets/my-post/photo.jpg
# imageAlt: A meaningful description of what is visible
# socialImage: /assets/my-post/social.jpg
# format: Note
# tags: [Editing]
# related: [another-post-filename]
draft: true
---
```

Write Markdown below the front matter. `excerpt` overrides the generated preview; `description` overrides search/social copy. Hero images are optional. Dates remain ISO formatted. `updated` must not precede `date`; an updated date only appears when its calendar date differs. `format`, `tags` and `related` prepare separate subject/format and relationship metadata without adding UI. Related posts can share any category. Use a `categories` list for blog subjects; the older single `category` field still works.

Drafts are visible and routable locally, with `noindex`, but excluded from production routes, archives, category options and sitemap. The shared `posts()` / `projects()` helpers in `src/lib/content.ts` centralize publication and ordering; they can later support pagination, year archives or feeds without manually maintained post arrays.

## Photography authoring

Add a file to `src/content/photography/`. Only the title is required; the Markdown body provides the introduction.

```yaml
---
title: Project title
# year: 2026
# date: 2026-09-14
# location: Your actual location
# category: Landscape
# description: A short project description for search/social previews
# coverImage: /assets/project/cover.jpg
# socialImage: /assets/project/social.jpg
draft: true
images:
  - src: /assets/project/frame.jpg
    alt: A meaningful description, or an empty string for a decorative image
    caption: Optional visible caption
---
```

The older `cover` field remains supported. `coverImage` takes precedence, then `cover`, then the first gallery image. A year takes precedence over an exact date for visible metadata. Location and category only appear when provided; undated projects sort after dated projects with newest first. Gallery images and captions are optional. Markdown image syntax is also supported and gains lightbox behaviour when JavaScript runs.

Alt text and captions are separate. Missing alt defaults to an empty string; supply meaningful alt when the photograph communicates content. The site does not invent descriptions from filenames or numbering. Optional featured photographs are still curated in `src/data/featured.ts`; adding a project never requires updating that list.

## Images

Prefer originals in `src/assets/`, referenced as `/assets/project/image.jpg`. Existing `/images/...` sources under `public/images/` also work. Legacy `../../assets/...` image paths remain supported. Use `ResponsiveImage.astro` in components; Markdown and raw HTML images receive the same dimensions and derivatives through the Markdown processor.

The pipeline creates WebP and JPEG sizes up to 2560px, without upscaling or cropping. Content hashes cache unchanged output and deduplicate identical source files. Cards, articles and lightboxes use responsive candidates; originals are never candidates. Dimensions come from the actual file after orientation. Tagged input is converted to standard sRGB for predictable web display; EXIF/GPS is stripped from derivatives. Originals remain untouched. For critical photography, inspect a representative web export on a colour-managed display before publishing.

External images require explicit dimensions in `ResponsiveImage` and are not processed. Keep publishing images local for consistent sizing, privacy and optimisation.

## Site identity and discovery

Edit `src/config/site.ts` for contact details and social links. Empty contact destinations are omitted. About content lives in `src/data/about.ts`. Retired demo articles and photography are stored outside the published content folders.

Shared SEO generates clean canonicals, Open Graph/Twitter cards and site/person JSON-LD. Articles add BlogPosting data. The fallback social card and touch icon are generated from the existing SVG identity assets. `/sitemap.xml` and `/robots.txt` are generated automatically. `/404.html` retains the masthead, theme and useful navigation.

RSS/Atom, search, pagination and year-archive UI are deliberately deferred. No feed endpoint or autodiscovery is enabled.
