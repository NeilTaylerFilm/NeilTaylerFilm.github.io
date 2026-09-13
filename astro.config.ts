// @ts-check

import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://neiltaylerfilm.github.io',
  output: 'static',
  trailingSlash: 'always',
  redirects: { '/blog': '/' },
  // Local recovery copies and package caches are not application source.
  vite: { server: { watch: { ignored: ['**/.qa/**', '**/.npm-cache/**'] } } },
  integrations: [
    mdx(),
    sitemap({ filter: (page) => !page.endsWith('/404/') && !page.endsWith('/blog/') }),
  ],
});
