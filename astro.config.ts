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

// https://astro.build/config
export default defineConfig({
  // 🌐 Official website web address
  site: 'https://neiltaylerfilm.github.io',
  // 📦 Build fast static HTML files
  output: 'static',
  // 🔗 Always add a trailing slash (e.g. /about/)
  trailingSlash: 'always',
  // 🔀 Send visitors from /blog to homepage
  redirects: { '/blog': '/' },
  // Local recovery copies and package caches are not application source.
  vite: { server: { watch: { ignored: ['**/.qa/**', '**/.npm-cache/**'] } } },
  markdown: {
    processor: unified({
      remarkPlugins: [sourceImagePaths],
      rehypePlugins: [
        [
          rehypeRaw,
          {
            passThrough: [
              'mdxjsEsm',
              'mdxJsxFlowElement',
              'mdxJsxTextElement',
              'mdxFlowExpression',
              'mdxTextExpression',
            ],
          },
        ],
        rehypeSanitize,
        markdownImages,
      ],
    }),
  },
  integrations: [mdx()],
});
