import type { APIContext } from 'astro';
import { posts, projects, isoDate } from '../lib/content';
export async function GET({ site }: APIContext) {
  const entries = [
    ...['/', '/photography/', '/about/', '/contact/'].map((url) => ({
      url,
      updated: undefined as Date | undefined,
    })),
    ...(await posts())
      .filter((p) => !p.data.draft)
      .map((p) => ({ url: `/blog/${p.id}/`, updated: p.data.updated || p.data.date })),
    ...(await projects())
      .filter((p) => !p.data.draft)
      .map((p) => ({ url: `/photography/${p.id}/`, updated: undefined })),
  ];
  const escape = (value: string) =>
    value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => `<url><loc>${escape(new URL(entry.url, site).href)}</loc>${entry.updated ? `<lastmod>${isoDate(entry.updated)}</lastmod>` : ''}</url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
