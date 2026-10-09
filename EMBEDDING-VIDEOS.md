# Embedding videos in post-production posts

Add two fields to the frontmatter at the top of your post in `src/content/post-production/`.

## Frontmatter fields

```yaml
video: "https://www.youtube.com/watch?v=VIDEO_ID"
poster: "https://assets.neiltaylerfilm.com/photos/your-poster.webp"
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
categories:
  - Explainer
  - Editing
video: "https://www.youtube.com/watch?v=YOUR_VIDEO_ID"
poster: "/images/your-poster.jpg"
draft: true
---
```

## Accepted video formats

Use any of these formats for `video`:

- Full YouTube URL: `https://www.youtube.com/watch?v=HAkxnRaTW2Q`
- Short YouTube URL: `https://youtu.be/HAkxnRaTW2Q`
- Raw YouTube ID: `HAkxnRaTW2Q`
- Full Vimeo URL: `https://vimeo.com/12345678`
- Raw Vimeo ID: `12345678`
