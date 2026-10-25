// ==========================================
// ⚙️ THE MASTER WEBSITE CONTROL PANEL (astro.config.ts)
// ==========================================
// This file tells the Astro website engine how to build your site!
// - Where the site lives on the web (https://neiltaylerfilm.github.io)
// - How to turn Markdown writing into beautiful HTML pages
// - How to safely clean up web text so bad scripts can't run
// - Redirecting "/blog" automatically to the front page "/"

// Neil Tayler Film - Astro build configuration.
// @ts-check

// --- BORROWED TOOLS (Imports) ---
// unified: The Markdown processing pipeline factory.
import { unified } from '@astrojs/markdown-remark';
import type { Root } from 'hast';
// mdx: Allows embedding interactive components directly inside Markdown articles.
import mdx from '@astrojs/mdx';
// rehypeRaw: Allows writing custom HTML elements inside Markdown files safely.
import rehypeRaw from 'rehype-raw';
// rehypeSanitize: Security guard scrubbing away dangerous or malicious scripts.
import rehypeSanitize from 'rehype-sanitize';
// markdownImages & sourceImagePaths: Our custom image optimizers converting markdown images into responsive pictures.
import markdownImages, { sourceImagePaths } from './scripts/markdown-images.mjs';
// defineConfig: Astro's official helper validating all configuration options.
import { defineConfig } from 'astro/config';

const mdxPassThrough = [
  'mdxjsEsm',
  'mdxJsxFlowElement',
  'mdxJsxTextElement',
  'mdxFlowExpression',
  'mdxTextExpression',
];

type MdxAwareNode = {
  type: string;
  name?: string;
  value?: unknown;
  children?: MdxAwareNode[];
  [key: string]: unknown;
};

export function rehypeSanitizeMdx() {
  const sanitize = rehypeSanitize();
  return (tree: Root) => {
    const trustedNodes = new Map<string, MdxAwareNode>();
    let nextId = 0;

    function mask(node: MdxAwareNode): MdxAwareNode {
      const trusted =
        node.type === 'mdxjsEsm' ||
        ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
          typeof node.name === 'string' &&
          /^[A-Z]/.test(node.name));

      if (trusted) {
        const children = node.children?.map(mask);
        const sanitizedChildren = children
          ? (sanitize({ type: 'root', children } as unknown as Root) as unknown as Root).children
          : undefined;
        const preserved = sanitizedChildren
          ? { ...node, children: sanitizedChildren as unknown as MdxAwareNode[] }
          : node;
        const token = `\u0000mdx-${nextId++}\u0000`;
        trustedNodes.set(token, preserved);
        return { type: 'text', value: token };
      }

      return node.children ? { ...node, children: node.children.map(mask) } : node;
    }

    function restore(node: MdxAwareNode): MdxAwareNode {
      const value = node.value;
      const original =
        node.type === 'text' && typeof value === 'string' ? trustedNodes.get(value) : undefined;
      const restored = original || node;
      return restored.children
        ? { ...restored, children: restored.children.map(restore) }
        : restored;
    }

    const masked = mask(tree as unknown as MdxAwareNode) as unknown as Root;
    return restore(sanitize(masked) as unknown as MdxAwareNode) as unknown as Root;
  };
}

// https://astro.build/config
export default defineConfig({
  // 🌐 Official website web address
  site: 'https://neiltaylerfilm.github.io',
  // 📦 Build fast static HTML files
  output: 'static',
  // 🔗 Always add a trailing slash (e.g. /about/)
  trailingSlash: 'always',
  // 🔀 Redirect legacy URLs to their current destinations
  redirects: {
    '/blog': '/',
    '/photography/20260809-late-night-drive-bts/':
      '/photography/20260801-late-night-drive-short-film-day-01/',
  },
  // Local recovery copies and package caches are not application source.
  vite: {
    server: {
      allowedHosts: ['neilmbp14.taild0d7b9.ts.net'],
      watch: { ignored: ['**/.qa/**', '**/.npm-cache/**'] },
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [sourceImagePaths],
      rehypePlugins: [[rehypeRaw, { passThrough: mdxPassThrough }], rehypeSanitize, markdownImages],
    }),
  },
  integrations: [
    mdx({
      processor: unified({
        remarkPlugins: [sourceImagePaths],
        rehypePlugins: [
          [rehypeRaw, { passThrough: mdxPassThrough }],
          rehypeSanitizeMdx,
          markdownImages,
        ],
      }),
    }),
  ],
});
