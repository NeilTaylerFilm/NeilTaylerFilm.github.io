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

import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import markdownImages, { sourceImagePaths } from './scripts/markdown-images.mjs';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://neiltaylerfilm.github.io', // 🌐 Official website web address
  output: 'static',                         // 📦 Build fast static HTML files
  trailingSlash: 'always',                  // 🔗 Always add a trailing slash (e.g. /about/)
  redirects: { '/blog': '/' },              // 🔀 Send visitors from /blog to homepage
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
