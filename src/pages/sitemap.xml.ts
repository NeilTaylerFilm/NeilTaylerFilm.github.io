// ==========================================
// 🗺️ WEBSITE TREASURE MAP (sitemap.xml.ts)
// ==========================================
// This file lists the homepage, fixed pages, published articles, and photo projects.
// Search engines read the list to find these pages.

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
  // Start with the fixed pages, then add public articles and photo projects.
  const entries = [
    ...['/', '/photography/', '/post-production/', '/about/', '/contact/'].map((url) => ({
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
  // Escape special XML characters so URLs with &, for example, do not break the sitemap.
  const escape = (value: string) =>
    value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => `<url><loc>${escape(new URL(entry.url, site).href)}</loc>${entry.updated ? `<lastmod>${isoDate(entry.updated)}</lastmod>` : ''}</url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
