# Embedding videos

## YouTube videos in blog posts

Keep Markdown posts as `.md`. Create an `.mdx` post in `src/content/blog/` when you need a video,
then import the component from that folder with `../../components/YouTubeEmbed.astro`.

```mdx
---
title: 'A post with a video'
date: 2026-10-25
draft: true
---

import YouTubeEmbed from '../../components/YouTubeEmbed.astro';

The article can introduce the video here.

<YouTubeEmbed
  url="https://youtu.be/VIDEO_ID"
  start={90}
  caption="A sequence from the finished film."
/>

Continue the article here.
```

Only `url` is required. It accepts a raw 11-character YouTube ID or a supported HTTPS YouTube URL.
Use `start` for a non-negative whole number of seconds; timestamps in the URL are ignored. `caption`
adds text below the player. `poster` accepts a site path or HTTPS image URL and uses the site's
responsive image manifest when available. `aspectRatio` is a width-to-height number, such as
`aspectRatio={4 / 3}`; it defaults to 16:9. The Play button loads the privacy-enhanced iframe only
after activation, and the caption area includes a Watch on YouTube link as a fallback.

Set `draft: true` while you preview a new article locally. Draft routes appear in development and
stay out of production builds.

## Videos in post-production posts

Add two fields to the frontmatter at the top of your post in `src/content/post-production/`.

## Frontmatter fields

```yaml
video: 'https://www.youtube.com/watch?v=VIDEO_ID'
poster: 'https://assets.neiltaylerfilm.com/photos/your-poster.webp'
```

The site places the video player directly below the subtitle and above the post body.

## Steps

1. Open your post file in `src/content/post-production/`.
2. Add `video:` with your YouTube URL or 11-character video ID between the `---` lines.
3. Add `poster:` with the image URL or local path for the thumbnail.
4. Save the file.

## Example

```yaml
---
title: A Song To Be Murdered By - Scene Breakdown
subtitle: Vanity Fair inspired scene by scene breakdown of "A Song To Be Murdered By", a short film I edited and colour graded in my last year of university.
date: 2026-10-09
category: Explainer
tags:
  - Editing
video: 'https://www.youtube.com/watch?v=YOUR_VIDEO_ID'
poster: '/images/your-poster.jpg'
draft: true
---
```

Use `category` for the optional primary kind of project and `tags` for optional secondary topics or crafts. For example, this scene breakdown can use `category: Explainer` and `tags: [Editing]`. Post-Production credits use the existing singular array field `role`, for example `role: [Editor, Colourist]`; keep professional contributions separate from tags.

## Accepted video formats

Use any of these formats for `video`:

- Full YouTube URL: `https://www.youtube.com/watch?v=HAkxnRaTW2Q`
- Short YouTube URL: `https://youtu.be/HAkxnRaTW2Q`
- Raw YouTube ID: `HAkxnRaTW2Q`
- Full Vimeo URL: `https://vimeo.com/12345678`
- Raw Vimeo ID: `12345678`

## YouTube videos in photography galleries

Photography albums use the existing ordered `images` list. Keep photo items in their current
`src:` format. Add a video item with `video:`; use an 11-character YouTube ID or a supported HTTPS
YouTube watch, short, live, or embed URL. Items stay in the order written.

```yaml
images:
  - src: 'https://assets.neiltaylerfilm.com/photos/your-photo.jpeg'
    alt: 'A quiet moment on set'
    caption: 'Between takes.'
  - video: 'https://youtu.be/VIDEO_ID'
    title: 'Behind the scenes'
    caption: 'A short film-set moment.'
    poster: '/assets/behind-the-scenes-poster.jpg'
    width: 1920
    height: 1080
  - src: 'https://assets.neiltaylerfilm.com/photos/another-photo.jpeg'
    alt: 'The crew resetting the scene'
```

`poster`, `title`, `alt`, `caption`, `section`, `width`, and `height` are optional. A custom poster
uses the site's existing responsive image manifest when available; the site otherwise falls back to
a YouTube thumbnail. Without `width` and `height`, the gallery uses the poster's known ratio or
16:9. If you declare dimensions, provide both and use the video's actual pixel ratio. The thumbnail
is only a preview; the privacy-enhanced YouTube player is created after a visitor presses Play.

The authoring field is `video:` inside an `images` item, never an iframe or HTML string. URLs are
validated and the embed URL is generated from the normalized video ID. YouTube unlisted videos are
publicly accessible to anyone with the link; they are not access-controlled.
