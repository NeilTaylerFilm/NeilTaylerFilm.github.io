import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  projects: [
    {
      name: 'webkit-iphone-14',
      use: { ...devices['iPhone 14'], browserName: 'webkit' },
    },
    {
      name: 'chromium-iphone-14',
      use: { ...devices['iPhone 14'], browserName: 'chromium' },
    },
    {
      name: 'desktop-chromium',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
    },
  ],
  use: { baseURL: 'http://127.0.0.1:4321' },
  webServer: {
    command: 'npx astro dev --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321/photography/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
