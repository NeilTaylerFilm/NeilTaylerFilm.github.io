import { readFileSync } from 'node:fs';
// Shared for Markdown image syntax and raw HTML <img> elements.
export default function markdownImages() {
  const manifest = JSON.parse(
    readFileSync(new URL('../src/generated/images.json', import.meta.url), 'utf8'),
  );
  return (tree) => {
    function visit(node) {
      if (node.type === 'element' && ['th', 'td'].includes(node.tagName) && node.properties.align) {
        node.properties.style = `text-align: ${node.properties.align}`;
        delete node.properties.align;
      }
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
