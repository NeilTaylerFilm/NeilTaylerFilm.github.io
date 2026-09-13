# Neil Tayler Film - Personal Website

An editorial-style personal website and photography portfolio built with [Astro](https://astro.build).

## Features

- **Editorial Design**: Clean, minimalist interface inspired by Macintosh aesthetics
- **Dark Mode Default**: Built-in theme support with localStorage persistence
- **Photo Gallery**: Responsive gallery with lightbox functionality
- **Blog System**: Markdown-based blogging with RSS feed
- **Photography Portfolio**: Project-based gallery with filtering and sorting
- **Multiple Views**: Editorial-style blog list, architecture portrait grid, minimal featured slider

## Tech Stack

- **Astro 7.3.2**: Static site generator
- **Content Collections**: Type-safe content management for blog posts and photography projects
- **CSS Custom Properties**: Built-in design system with dark/light mode
- **Tailwind CSS**: Utility-first CSS framework
- **GitHub Pages**: Automatic deployment on push to `main`

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The site will be available at `http://localhost:4323`.

## Build & Deploy

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

Deployment to GitHub Pages is automated via GitHub Actions. Pushing to the `main` branch triggers a build and deployment to `https://neiltaylerfilm.github.io/`.

## Content Structure

### Blog Posts
Posts are stored in `src/content/blog/` as Markdown/MDX files with frontmatter containing:
- `title`, `subtitle` (optional)
- `date` (required)
- `category` (required)
- `image` (optional)
- `excerpt` (optional)
- `draft` (optional, default: false)

### Photography Projects
Projects are stored in `src/content/photography/` as Markdown/MDX files with frontmatter containing:
- `title`, `subtitle` (optional)
- `date` (required)
- `category` (required)
- `cover` (optional)
- `images` (optional array of image objects with `src`, `alt`, `caption`, etc.)
- `draft` (optional, default: false)

## License

MIT