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
// --- BORROWED TOOLS (Imports) ---
// readFileSync: Synchronously reads the generated image manifest during build setup.
import { readFileSync } from 'node:fs';

const readingImageSizes = '(max-width: 767px) 90vw, 700px';
const articleMediaSizes =
  '(max-width: 359px) calc(100vw - 32px), (max-width: 540px) calc(100vw - 40px), (max-width: 747px) calc(100vw - 48px), (max-width: 1050px) 700px, 820px';

function onlyElementChild(node) {
  const children = (node.children || []).filter(
    (child) => child.type !== 'text' || child.value.trim(),
  );
  return children.length === 1 && children[0].type === 'element' ? children[0] : null;
}

function articleMediaImage(node) {
  if (node.type !== 'element' || node.tagName !== 'p') return false;

  const content = onlyElementChild(node);
  if (!content) return null;
  const image =
    content.tagName === 'a' && content.properties.title !== 'cite'
      ? onlyElementChild(content)
      : content;

  return image?.type === 'element' &&
    image.tagName === 'img' &&
    !image.properties.dataCitationIcon &&
    !image.properties.className?.includes('citation-icon')
    ? node
    : null;
}

function articleMediaCaption(node) {
  const emphasis = node?.type === 'element' && node.tagName === 'p' ? onlyElementChild(node) : null;
  return emphasis?.tagName === 'em' ? emphasis : null;
}

function groupArticleMedia(tree) {
  if (tree.type !== 'root') return;

  const children = tree.children || [];
  const grouped = [];
  for (let index = 0; index < children.length; index += 1) {
    const paragraph = articleMediaImage(children[index]);
    if (!paragraph) {
      grouped.push(children[index]);
      continue;
    }

    let captionIndex = index + 1;
    while (children[captionIndex]?.type === 'text' && !children[captionIndex].value.trim()) {
      captionIndex += 1;
    }
    const caption = articleMediaCaption(children[captionIndex]);
    const figure = {
      type: 'element',
      tagName: 'figure',
      properties: { className: ['article-media-figure'] },
      children: paragraph.children.filter((child) => child.type !== 'text' || child.value.trim()),
    };
    const media = {
      type: 'element',
      tagName: 'div',
      properties: { dataArticleMedia: '' },
      children: [figure],
    };

    if (caption) {
      figure.children.push({
        type: 'element',
        tagName: 'figcaption',
        properties: {},
        children: [caption],
      });
      index = captionIndex;
    }
    grouped.push(media);
  }
  tree.children = grouped;
}

// Shared for Markdown image syntax and raw HTML <img> elements.
export default function markdownImages() {
  // 📖 Read the image measurement database
  const manifest = JSON.parse(
    readFileSync(new URL('../src/generated/images.json', import.meta.url), 'utf8'),
  );

  return (tree, file) => {
    const isArticleDocument = /(?:^|[\\/])src[\\/]content[\\/](?:blog|post-production)[\\/]/.test(
      file?.path || '',
    );
    if (isArticleDocument) groupArticleMedia(tree);

    // 🔍 Walk through every node (element) in the article tree
    function visit(node, articleMedia = false) {
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
            sizes: articleMedia ? articleMediaSizes : readingImageSizes,
            width: info.width,
            height: info.height,
            loading: 'lazy',
            decoding: 'async',
            'data-full-image': info.full,
          });
        if (p.alt === undefined) p.alt = '';
      }
      node.children?.forEach((child) => {
        const isTopLevelMedia =
          isArticleDocument && child.properties?.dataArticleMedia !== undefined;
        visit(child, articleMedia || isTopLevelMedia);
      });
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
