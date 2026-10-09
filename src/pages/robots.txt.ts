// ==========================================
// 🤖 SEARCH ROBOT INSTRUCTIONS (robots.txt.ts)
// ==========================================
// This file acts like a "Please Do Not Enter" sign for automated web bots.
// It asks AI scrapers (like ChatGPT and Claude) not to crawl your personal work,
// while inviting search engines like Google to index your sitemap!

// Robots.txt - requests that AI crawlers (GPTBot, ClaudeBot, Google-Extended) not index the site.
import type { APIContext } from 'astro';
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
