// ==========================================
// 🗺️ WEBSITE TREASURE MAP (sitemap.xml.ts)
// ==========================================
// This file automatically builds a clean catalog of every published article,
// gallery, and page on your website. Search engines like Google read this
// map so they know exactly which links to display in search results!

// Sitemap XML generator listing all published pages and posts.
// --- BORROWED TOOLS (Imports) ---
// APIContext: Astro's type definition providing the configured site web address.
import type { APIContext } from 'astro';
// posts, projects, isoDate: Librarians that fetch live content and format dates.
import { posts, projects, isoDate } from '../lib/content';

// 🗺️ The GET endpoint handler:
// What goes in: APIContext with the site URL.
// What comes out: An XML document listing every public URL for search engines.
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
