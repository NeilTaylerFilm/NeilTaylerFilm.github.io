// @ts-check

import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import rehypeRaw from 'rehype-raw';
import markdownImages, { sourceImagePaths } from './scripts/markdown-images.mjs';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://neiltaylerfilm.github.io',
  output: 'static',
  trailingSlash: 'always',
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
        markdownImages,
      ],
    }),
  },
  integrations: [mdx()],
});
