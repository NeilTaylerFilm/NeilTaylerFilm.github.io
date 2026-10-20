# Embedding videos in post-production posts

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
