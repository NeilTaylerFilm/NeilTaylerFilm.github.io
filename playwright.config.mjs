import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_DEV_PORT || 4321);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/browser',
  projects: [
    {
      name: 'webkit-iphone-14',
      grepInvert: /@desktop-regression/,
      use: { ...devices['iPhone 14'], browserName: 'webkit' },
    },
    {
      name: 'chromium-iphone-14',
      grepInvert: /@desktop-regression/,
      use: { ...devices['iPhone 14'], browserName: 'chromium' },
    },
    {
      name: 'desktop-chromium',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'desktop-webkit',
      testMatch: /post-production-slideshow\.spec\.mjs$/,
      grep: /@desktop-regression|@responsive-order/,
      use: { browserName: 'webkit', viewport: { width: 1280, height: 900 } },
    },
  ],
  use: { baseURL },
  webServer: {
    command: `npx astro dev --host 127.0.0.1 --port ${port}`,
    url: `${baseURL}/photography/`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
