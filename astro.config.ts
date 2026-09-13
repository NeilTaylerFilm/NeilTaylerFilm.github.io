// @ts-check

import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://neiltaylerfilm.github.io',
  output: 'static',
  trailingSlash: 'always',
  redirects: { '/blog': '/' },
  integrations: [
    sitemap({ filter: (page) => !page.endsWith('/404/') && !page.endsWith('/blog/') }),
  ],
  image: {
    domains: [],
    remotePatterns: [],
  },
});