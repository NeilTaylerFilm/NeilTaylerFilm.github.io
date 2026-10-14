---
type: "query"
date: "2026-10-14T09:31:46.548851+00:00"
question: "can you explain to me how the featured slideshow component on my website works?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["PhotographySlideshow component — renders the featured photography carousel", "PostProductionSlideshow.astro", "setupPhotographyViewer()", "featured"]
---

# Q: can you explain to me how the featured slideshow component on my website works?

## Answer

Expanded from original query via vocab: [featured, slideshow, photography, viewer, photo, post, project, video]. The live carousel is on /post-production/ and uses PostProductionSlideshow.astro with data from post-production-featured.ts. Astro prepares poster and embed URLs, renders the first slide, and places the full slide list in data-slides. setupPhotographyViewer handles navigation, image loading, animation, keyboard and touch input. The video layer adds an iframe only when Play is clicked and clears it on slide changes. The /photography/ route currently uses PhotographyPortfolio and a grid/lightbox; PhotographySlideshow.astro is not imported by a page.

## Outcome

- Signal: useful

## Source Nodes

- PhotographySlideshow component — renders the featured photography carousel
- PostProductionSlideshow.astro
- setupPhotographyViewer()
- featured