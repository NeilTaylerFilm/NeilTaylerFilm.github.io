// ==========================================
// 🤖 SEARCH ROBOT INSTRUCTIONS (robots.txt.ts)
// ==========================================
// This file acts like a "Please Do Not Enter" sign for automated web bots.
// It asks AI scrapers (like ChatGPT and Claude) not to crawl your personal work,
// while inviting search engines like Google to index your sitemap!

// Robots.txt - requests that AI crawlers (GPTBot, ClaudeBot, Google-Extended) not index the site.
// --- BORROWED TOOLS (Imports) ---
// APIContext: Astro's type definition providing the configured site web address.
import type { APIContext } from 'astro';

// 🤖 The GET endpoint handler:
// What goes in: APIContext with the site URL.
// What comes out: A plain text Response served at /robots.txt.
export function GET({ site }: APIContext) {
  const policy = [
    '# These rules are requests to cooperative crawlers, not access controls.',
    'User-agent: GPTBot',
    'Disallow: /',
    '',
    'User-agent: Google-Extended',
    'Disallow: /',
    '',
    'User-agent: ClaudeBot',
    'Disallow: /',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${new URL('sitemap.xml', site)}`,
    '',
  ].join('\n');

  return new Response(policy, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
