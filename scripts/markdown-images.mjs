// ==========================================
// 🪄 THE MARKDOWN BOOK EDITOR (scripts/markdown-images.mjs)
// ==========================================
// When you write a blog post in Markdown, you use simple syntax like:
// ![Sunset](/assets/sunset.jpg)
// This script acts like a magical proofreader before the page turns into HTML:
// 1. It turns simple image tags into smart, responsive images with lazy loading and width/height.
// 2. When you add a citation [Source](https://... "cite"), it automatically grabs
//    the source's tiny favicon icon so it looks like a sleek academic reference badge!
// 3. It cleans up tables so text aligns nicely.

// Resolve Markdown image syntax and <img> elements against the image manifest.
import { readFileSync } from 'node:fs';

// Shared for Markdown image syntax and raw HTML <img> elements.
export default function markdownImages() {
  // 📖 Read the image measurement database
  const manifest = JSON.parse(
    readFileSync(new URL('../src/generated/images.json', import.meta.url), 'utf8'),
  );

  return (tree) => {
    // 🔍 Walk through every node (element) in the article tree
    function visit(node) {
      // 📊 1. Fix table cell alignment
      if (node.type === 'element' && ['th', 'td'].includes(node.tagName) && node.properties.align) {
        node.properties.style = `text-align: ${node.properties.align}`;
        delete node.properties.align;
      }

      // 🏷️ 2. Turn citations [Like this](url "cite") into badges with the site's favicon icon!
      if (node.type === 'element' && node.tagName === 'a' && node.properties.title === 'cite') {
        try {
          const source = new URL(String(node.properties.href || ''));
          if (['http:', 'https:'].includes(source.protocol))
            node.children.unshift({
              type: 'element',
              tagName: 'img',
              properties: {
                src: new URL('/favicon.ico', source.origin).href,
                alt: '',
                width: 16,
                height: 16,
                loading: 'lazy',
                decoding: 'async',
                referrerPolicy: 'no-referrer',
                className: ['citation-icon'],
                dataCitationIcon: '',
                ariaHidden: 'true',
              },
              children: [],
            });
        } catch {
          // Keep citations with relative or invalid URLs as text-only chips.
        }
      }

      // 🖼️ 3. Enhance <img> tags with responsive sizes and lazy loading
      if (node.type === 'element' && node.tagName === 'img') {
        const p = node.properties;
        const src = String(p.src || '').replace(/^(?:\.\.\/)+assets\//, '/assets/');
        const info = manifest[src];
        if (info)
          Object.assign(p, {
            src: info.src,
            srcSet: info.srcset,
            sizes: '(max-width: 767px) 90vw, 700px',
            width: info.width,
            height: info.height,
            loading: 'lazy',
            decoding: 'async',
            'data-full-image': info.full,
          });
        if (p.alt === undefined) p.alt = '';
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}

// 🧹 THE PATH CLEANER:
// Fixes old relative paths (like "../../assets/photo.jpg") into clean "/assets/photo.jpg"
// Normalize legacy source paths before Astro collects local image imports.
// Our derivative manifest owns these images, so originals need not enter the bundle.
export function sourceImagePaths() {
  return (tree) => {
    function visit(node) {
      if (node.type === 'image') node.url = node.url.replace(/^(?:\.\.\/)+assets\//, '/assets/');
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
