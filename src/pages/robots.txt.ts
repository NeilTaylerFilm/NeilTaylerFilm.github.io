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
