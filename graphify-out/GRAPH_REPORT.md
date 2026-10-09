# Graph Report - neiltaylerfilm.github.io  (2026-09-23)

## Corpus Check
- 94 files · ~187,239 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 5, .woff 2, .css 2)

## Summary
- 380 nodes · 573 edges · 32 communities (28 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Site Pages and Components
- Build and Dependencies
- Photo Publishing Guides
- Image Delivery and Gallery
- Image Upload Pipeline
- Astro UI Components
- Development and Build Scripts
- Navigation and Site Shell
- Astro Content Collections
- Photo Library Audits
- Gallery Viewer Interactions
- Retired Demo Photo Stories
- R2 Setup Tooling
- Build Output Checks
- Repository Instructions
- Landscape Photo Examples
- Browser Quality Checks
- Formatting Configuration
- TypeScript Configuration
- Editorial Blog Examples
- File Naming Examples
- Blog Starter Examples
- Demo Image Credits
- Editing Judgment Examples
- Website Refinement Notes
- Sports Photo Project
- Matt and Louise Engagement
- Late Night Drive BTS
- Draft Visibility Rules
- Unfinished Writing Example
- Mountain Photo Example
- Portrait Photo Example

## God Nodes (most connected - your core abstractions)
1. `scripts` - 20 edges
2. `setupPhotographyViewer()` - 14 edges
3. `categoryKey()` - 12 edges
4. `R2 photo upload and publishing guide` - 12 edges
5. `BaseLayout layout — provides the shared document frame, header, main content area, footer and SEO` - 12 edges
6. `Project overview and authoring README` - 10 edges
7. `load()` - 8 edges
8. `Publish a photography project guide` - 8 edges
9. `site` - 7 edges
10. `projects()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Astro background development server` --semantically_similar_to--> `Astro background development server`  [INFERRED] [semantically similar]
  AGENTS.md → CLAUDE.md
- `Official Astro documentation` --semantically_similar_to--> `Official Astro documentation`  [INFERRED] [semantically similar]
  AGENTS.md → CLAUDE.md
- `Beginner guide to Astro and GitHub Pages` --semantically_similar_to--> `Simple guide to publishing website changes`  [INFERRED] [semantically similar]
  GITHUB-PAGES-ASTRO-GUIDE.md → PUBLISH-TO-PRODUCTION.md
- `Website content and publishing guide` --semantically_similar_to--> `Publish a photography project guide`  [INFERRED] [semantically similar]
  PUBLISHING.md → PUBLISH-A-PHOTO-PROJECT.md
- `Multiple blog categories` --semantically_similar_to--> `Multi-category blog authoring`  [INFERRED] [semantically similar]
  PUBLISHING.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three-part photo storage arrangement** — backup_and_recovery_three_storage_places, backup_and_recovery_photo_address_registry, r2_photos_public_photo_delivery [EXTRACTED 1.00]
- **Photo inbox, responsive derivatives, and image registry participate in R2 photo publishing** — r2_photos_photo_inbox, r2_photos_responsive_derivative_pipeline, r2_photos_registry [EXTRACTED 1.00]
- **Beginner publishing guidance spans the general Astro guide, content guide, and production guide** — github_pages_astro_guide, publishing_guide, publish_to_production_guide [INFERRED 0.85]

## Communities (32 total, 4 thin omitted)

### Community 0 - "Site Pages and Components"
Cohesion: 0.12
Nodes (21): categories(), postProjects(), posts(), projects(), categoryKey(), comparators, excerpt(), isoDate() (+13 more)

### Community 1 - "Build and Dependencies"
Cohesion: 0.06
Nodes (35): allowScripts, esbuild, dependencies, astro, @astrojs/markdown-remark, @astrojs/mdx, rehype-raw, rehype-sanitize (+27 more)

### Community 2 - "Photo Publishing Guides"
Cohesion: 0.07
Nodes (38): Website and photograph backup and recovery guide, Offline photo registry audit, R2 image address and responsive-size registry, Three-part website and photo storage arrangement, Browser cache policy for uploaded and manually named images, Cloudflare photo delivery setup guide, Image Worker to R2 bucket binding, Beginner guide to Astro and GitHub Pages (+30 more)

### Community 3 - "Image Delivery and Gallery"
Cohesion: 0.09
Nodes (17): types, ref_node_assert, ref_node_test, info, featured, featuredIsDemo, FeaturedPhoto, featured (+9 more)

### Community 4 - "Image Upload Pipeline"
Cohesion: 0.11
Nodes (25): @aws-sdk/client-s3, ref_node_child_process, ref_node_crypto, ref_node_fs, ref_node_os, ref_node_path, ref_node_util, sharp (+17 more)

### Community 5 - "Astro UI Components"
Cohesion: 0.12
Nodes (25): BlogCard component — renders a blog post summary with its image and metadata, ContactIcon component — renders an inline icon for a contact method, FeedControls component — provides category filtering and date sorting for a content feed, Footer component — renders the site name and copyright, Gallery component — displays project photos in sections with an optional justified layout, Header component — renders primary navigation and the theme control, Lightbox component — provides an enlarged photo dialog with captions and previous/next controls, PhotographySlideshow component — renders the featured photography carousel (+17 more)

### Community 6 - "Development and Build Scripts"
Cohesion: 0.10
Nodes (20): scripts, build, check, dev, dev:logs, dev:status, dev:stop, format (+12 more)

### Community 7 - "Navigation and Site Shell"
Cohesion: 0.17
Nodes (6): nav, canonical, socialImage, site, SiteConfig, about

### Community 8 - "Astro Content Collections"
Cohesion: 0.19
Nodes (10): astro, ref_astro_content, blog, collections, common, photography, postProduction, matchingProjectYear() (+2 more)

### Community 9 - "Photo Library Audits"
Cohesion: 0.15
Nodes (10): ref_node_url, errors, extensions, referencedIds, references, registeredUrls, registry, registryPath (+2 more)

### Community 10 - "Gallery Viewer Interactions"
Cohesion: 0.39
Nodes (12): setupPhotographyViewer(), clearError(), highlight(), keepThumbnailVisible(), load(), makeImage(), openViewer(), preload() (+4 more)

### Community 11 - "Retired Demo Photo Stories"
Cohesion: 0.18
Nodes (11): After the light changes, Balancing light and shadow, Night street photography, Photography category, Using contact sheets to edit a photo sequence, Photography category, The space between frames, Passing through (+3 more)

### Community 12 - "R2 Setup Tooling"
Cohesion: 0.22
Nodes (7): getpass, os, pathlib, re, Save R2 upload credentials locally without displaying them or using shell…, subprocess, tempfile

### Community 13 - "Build Output Checks"
Cohesion: 0.29
Nodes (7): decode(), errors, htmlFiles, resolveURL(), root, titles, walk()

### Community 14 - "Repository Instructions"
Cohesion: 0.40
Nodes (6): Astro background development server, Official Astro documentation, Repository development guidance, Astro background development server, Official Astro documentation, Claude development guidance

### Community 15 - "Landscape Photo Examples"
Cohesion: 0.33
Nodes (6): Between the trees, Landscape category, Landscape photography, Landscape category, Landscape photography, Quiet places

### Community 16 - "Browser Quality Checks"
Cohesion: 0.33
Nodes (3): pages, ref_fs, ref_playwright_core

### Community 17 - "Formatting Configuration"
Cohesion: 0.40
Nodes (4): overrides, plugins, printWidth, singleQuote

### Community 18 - "TypeScript Configuration"
Cohesion: 0.40
Nodes (4): astro/tsconfigs/strict, exclude, extends, include

### Community 19 - "Editorial Blog Examples"
Cohesion: 0.50
Nodes (4): A good edit knows when to stop, Editorial judgement and knowing when to stop, A small system for finding things later, when you’ve forgotten what you called them, Date, project, stage, and version file naming convention

### Community 20 - "File Naming Examples"
Cohesion: 0.50
Nodes (4): A small system for finding things later, Date-first file naming, Keeping short notes with project files, Project, stage and version labels

### Community 21 - "Blog Starter Examples"
Cohesion: 0.67
Nodes (4): Blog post authoring with Markdown content, Welcome to My Blog (hello-world example), Blog post authoring with Markdown content, Welcome to My Blog (welcome example)

### Community 22 - "Demo Image Credits"
Cohesion: 0.67
Nodes (3): Sources for retired demo photography, Unsplash license, Unsplash demonstration photographs

### Community 23 - "Editing Judgment Examples"
Cohesion: 0.67
Nodes (3): A good edit knows when to stop, Knowing when to stop editing, Versioning edits for comparison

### Community 24 - "Website Refinement Notes"
Cohesion: 0.67
Nodes (3): Website refinement implementation and verification report, Accessibility and SEO improvements, Deferred feeds, search, pagination, and archive UI

### Community 25 - "Sports Photo Project"
Cohesion: 0.67
Nodes (3): Flackwell Heath vs Barton - Women's Football, Photo gallery using R2-hosted image URLs, Sports category

### Community 26 - "Matt and Louise Engagement"
Cohesion: 0.67
Nodes (3): Engagement category, Engagement photo gallery, Matt & Louise

### Community 27 - "Late Night Drive BTS"
Cohesion: 0.67
Nodes (3): Behind The Scenes category, Gallery grouped by shoot days, Late Night Drive - BTS

## Knowledge Gaps
- **145 isolated node(s):** `plugins`, `singleQuote`, `printWidth`, `overrides`, `types` (+140 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 178 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `astro` connect `Astro Content Collections` to `Site Pages and Components`, `Build and Dependencies`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `scripts` connect `Development and Build Scripts` to `Build and Dependencies`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `sharp` connect `Image Upload Pipeline` to `Build and Dependencies`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `setupPhotographyViewer()` (e.g. with `PhotographySlideshow.astro` and `PostProductionSlideshow.astro`) actually correct?**
  _`setupPhotographyViewer()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `plugins`, `singleQuote`, `printWidth` to the rest of the system?**
  _145 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Site Pages and Components` be split into smaller, more focused modules?**
  _Cohesion score 0.12050739957716702 - nodes in this community are weakly interconnected._
- **Should `Build and Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06258890469416785 - nodes in this community are weakly interconnected._