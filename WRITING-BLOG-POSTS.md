# Writing a blog post

Write the post in Obsidian, then save it as a Markdown file (`.md`) in `src/content/blog/` in the website folder. The filename becomes the end of the web address, so use lowercase words separated by hyphens, for example `canon-r6-iii-review.md`. Keep the filename stable after publishing so the post URL stays stable.

This guide covers blog posts only. For the broader steps to preview and publish website changes, see [PUBLISHING.md](PUBLISHING.md) and [PUBLISH-TO-PRODUCTION.md](PUBLISH-TO-PRODUCTION.md). For uploading pictures and finding their addresses, see [R2-PHOTOS.md](R2-PHOTOS.md).

## Start with the post information

Every post needs a title, date, and at least one category. Put these between the opening and closing `---` lines at the top of the file. The post itself starts after the second `---`.

```yaml
---
title: 'Canon R6 III review'
date: 2026-10-07
categories:
  - Reviews
subtitle: 'A short line that appears beneath the title'
description: 'A concise summary for search results and shared links.'
excerpt: 'A short introduction for the blog listing.'
draft: true
---

Start writing here.
```

Use the real publication date in `YYYY-MM-DD` form. Set `draft: true` while writing or reviewing. Drafts appear when you preview the site locally, but are left out of the production site. Set it to `false` (or remove the line) when the post is ready to publish.

### Supported fields

| Field | What it does |
| --- | --- |
| `title` | Required. The post title shown on the page and blog card. |
| `date` | Required. Publication date, written `YYYY-MM-DD`. |
| `category` | One category. Use `categories` if there is more than one. |
| `categories` | A list of one or more categories. At least one category field is required. |
| `subtitle` | Optional line under the title and on the blog card. |
| `description` | Optional search/social description; also supplies the blog-card excerpt if `excerpt` is omitted. |
| `excerpt` | Optional blog-card excerpt. If both `excerpt` and `description` are omitted, the site makes one from the first two sentences of the body. |
| `updated` | Optional date for a later substantial update. It must be the same day or later than `date`; it is shown when it differs from the publication date. |
| `image` | Optional lead image. It appears above the article, on the blog card, and is the default social-sharing image. |
| `imageAlt` | Description for the lead image, for people who cannot see it. Defaults to empty text, so add a useful description when the image conveys information. |
| `socialImage` | Optional image used for social sharing instead of `image`. |
| `draft` | Defaults to `false`. Set `true` to keep the post out of production. |
| `demo` | Defaults to `false`. Set `true` only for demonstration copy; the page labels it as an example. |

`format`, `tags`, and `related` are accepted in the post information, but currently do not add visible labels or manually select the related-post list. Related posts are chosen automatically from shared categories. You can leave these fields out.

Use one category spelling consistently (for example, `Reviews` each time). The older single `category: Reviews` form works, but `categories` is preferred.

## Use headings for sections and chapters

The title in `title:` is already the page's main heading. Do not repeat it as a `#` heading in the body. Use `##` for main sections, then `###`, `####`, and deeper levels for subsections.

```markdown
## TL;DR

Your brief summary goes here.

## Why I chose this camera

The main section text goes here.

### Photography was not the reason

This is a subsection of the section above.

#### A more specific point

This sits one level deeper.
```

Headings from `##` through `######` appear in the chapter menu and get expand/collapse arrows. The menu indents deeper heading levels under shallower ones. A chapter menu appears when the post has at least two such headings. You can start with `###` if the article has no `##` headings; menu indentation is relative to the shallowest heading used.

Sections start expanded. A heading named `TL;DR` starts collapsed (capitalisation does not matter; `TLDR` also matches). Put the summary immediately below it, then start the next main section with another `##` heading. Content stays within a heading's section until the next heading of the same or a higher level. A nested subsection collapses along with its parent. If a reader opens a chapter-menu link to a nested heading, the site opens its collapsed parent sections too.

Avoid heading levels just for visual size. For example, use `###` below `##`, not `####` unless it is actually a deeper subsection. A single heading can still be collapsed even if no chapter menu is shown.

## Add pictures

### Pictures inside the article

For the site's R2 image workflow, put a picture in `photo-inbox`, run the upload steps in [R2-PHOTOS.md](R2-PHOTOS.md), then open `photo-inbox/UPLOAD-RESULTS.md`. Copy the generated **Blog body** Markdown line and paste it on its own line between paragraphs. That line contains the real image address; copy it exactly. The upload results are replaced by the next successful batch, so use the generated line while it is available.

The line looks like this (the address below is only a placeholder):

```markdown
![A short description of the photograph](PASTE-THE-REAL-ADDRESS-FROM-UPLOAD-RESULTS-HERE)
```

Use the address from your upload results. Describe what matters in the image inside the square brackets. This is alt text for accessibility, not a visible caption. Leave a blank line before and after the image. For a visible caption, add an italic line below it:

```markdown
![A camera on a table](PASTE-THE-REAL-ADDRESS-FROM-UPLOAD-RESULTS-HERE)

*The camera ready for a day of filming.*
```

`src/data/r2-images.json` is the site's generated registry of image addresses and sizes; it is keyed by address, not filename, so use `UPLOAD-RESULTS.md` to match a picture to its generated address. Do not edit the registry by hand. Include its updated version when publishing new uploaded pictures.

### Lead image above the article

In `UPLOAD-RESULTS.md`, copy the generated **Blog cover** fields into the frontmatter between the `---` lines. They look like this:

```yaml
image: 'PASTE-THE-REAL-ADDRESS-FROM-UPLOAD-RESULTS-HERE'
imageAlt: 'A short description of the photograph'
```

The lead image is also used on the blog card. If you want a different image for social sharing, add `socialImage:` with that image's address. Otherwise `image` is used. A lead image is optional; a post can use only pictures in its body.

R2-uploaded images are resized for different screens by the site. Do not invent or edit the long image address. Obsidian vault attachments are not uploaded to the website automatically. If you deliberately store an image in the site's `public/images/` folder instead, reference it from the site root, for example `public/images/example.jpg` becomes `![A short description](/images/example.jpg)`. The file must exist at that location in the website repository.

## Markdown that works well in Obsidian and on the site

The site reads standard Markdown. These common forms work:

````markdown
This is **bold** and this is *italic*.

[A link to another page](https://example.com)

- An unordered list
- Another item

1. A numbered step
2. The next step

> A quotation

`short code` and a fenced code block:

```text
example code goes here
```
````

Use standard Markdown links and image links when you want the result to work on the published site. Obsidian-only wikilinks such as `[[Another note]]`, embeds such as `![[photo.jpg]]`, and vault attachment paths are not configured as website links or images here. For another blog post, use its website path, for example `[Another post](/blog/other-post-filename/)`; for an external website use `[words](https://example.com)`. For blog images, use the generated R2 Markdown line or a site asset path such as `/images/example.jpg` for a file in `public/images/`.

The site sanitizes raw HTML in Markdown. Prefer ordinary Markdown for formatting rather than relying on pasted HTML or Obsidian plugins.

## Preview and publish

1. Save the post in `src/content/blog/` with `draft: true`.
2. Preview locally using the steps in [PUBLISHING.md](PUBLISHING.md). Check the title, category, chapter menu, collapsed TL;DR, image display, and links.
3. When ready, change `draft: true` to `draft: false` (or remove the field), save, and follow [PUBLISH-TO-PRODUCTION.md](PUBLISH-TO-PRODUCTION.md).

Saving in Obsidian only saves a local file. The public site changes only after the publishing steps are completed. R2 photographs become publicly accessible as soon as they are uploaded, even if the post is still a draft.

## Quick checklist

- [ ] File is in `src/content/blog/` and ends in `.md`.
- [ ] Filename uses lowercase words and hyphens; keep it stable after publishing.
- [ ] Frontmatter has `title`, `date`, and `category` or `categories`.
- [ ] Body starts after the closing `---`; no duplicate `#` title.
- [ ] Main sections use `##`; nested sections use the next heading level.
- [ ] TL;DR is its own heading and the next `##` begins after its summary.
- [ ] Images use the generated real address and have meaningful alt text.
- [ ] Preview looks right; unfinished posts remain `draft: true`.
