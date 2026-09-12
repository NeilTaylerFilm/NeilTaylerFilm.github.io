# Neil Tayler Film - Personal Blog

A personal blog built with [Astro](https://astro.build) and hosted on GitHub Pages.

## 🚀 Project Structure

```
/src
  /components   # Reusable UI components (Header, Footer, etc.)
  /content      # Blog posts in Markdown/MDX
    /blog       # Individual blog posts
  /layouts      # Page layouts (BlogPost.astro)
  /pages        # Site pages (index.astro, about.astro, blog/, rss.xml.js)
  /styles       # CSS styles
/public         # Static assets (favicon, etc.)
/.github        # GitHub Actions workflows
```

## 🛠️ Development

### Prerequisites

- Node.js (v18 or higher)
- npm (comes with Node.js)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Local Development

Start the development server:
```bash
npm run dev
```

Your site will be available at `http://localhost:4321`. The server will automatically reload when you make changes.

### Production Build

Generate a production-ready build:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

## 📝 Creating Blog Posts

Blog posts are stored as Markdown (`.md`) or MDX (`.mdx`) files in `src/content/blog/`.

### Frontmatter

Each post requires frontmatter at the top of the file:

```markdown
---
title: "Post Title"
description: "A brief summary of the post"
pubDate: "2026-09-12"
tags:
  - technology
  - post-production
---
```

### Example Post

See `src/content/blog/hello-world.md` for a sample post. You can delete this file when you're ready to create your own content.

## 🚀 Publishing Changes

This site is configured to automatically deploy to GitHub Pages when you push to the `main` branch.

1. Make your changes locally
2. Stage your changes:
   ```bash
   git add .
   ```
3. Commit your changes:
   ```bash
   git commit -m "Description of changes"
   ```
4. Push to GitHub:
   ```bash
   git push
   ```

GitHub Actions will automatically build and deploy your site. You can monitor the progress in the **Actions** tab of your repository.

## 🔧 Configuration

### Site URL

The site URL is configured in `astro.config.mjs`:
```javascript
site: 'https://NeilTaylerFilm.github.io',
```

### Content Schema

Blog post frontmatter is validated by the schema in `src/content.config.ts`:
- `title` (string, required)
- `description` (string, required)
- `pubDate` (date, required)
- `updatedDate` (date, optional)
- `heroImage` (image, optional)
- `tags` (array of strings, optional)

## 🌐 GitHub Pages Setup

After pushing your first commit to `main`:

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. Your site will be deployed at `https://NeilTaylerFilm.github.io`

## 🎨 Customization

- **Site title and description**: Edit `src/consts.ts`
- **Header navigation**: Edit `src/components/Header.astro`
- **Footer**: Edit `src/components/Footer.astro`
- **Styles**: Modify CSS in `/src/styles/` or individual components
- **Layouts**: Edit files in `/src/layouts/`

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---
Built with [Astro](https://astro.build) ❤️