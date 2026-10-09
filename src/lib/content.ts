// ==========================================
// 📚 THE CONTENT LIBRARIAN (Fetching & Sorting Work)
// ==========================================
// Think of this file like a super helpful librarian.
// Whenever a page says "Hey, show me all the blog articles!" or
// "Show me all photography projects!", this librarian goes into
// the content folders, hides any unfinished drafts, sorts everything
// by newest first, and hands them over!

// Helpers for loading and sorting blog, photography, and post-production content
// --- BORROWED TOOLS (Imports) ---
// getCollection: Astro's master key to open content folders and fetch all markdown files.
import { getCollection } from 'astro:content';
// categoryKey, projectTimestamp, postCategories: Feed helpers for sorting, slugifying, and categorizing.
import { categoryKey, projectTimestamp, postCategories } from './feed';
// Re-export helpers so other files can grab them from one convenient place
export { excerpt, isoDate, categoryKey, comparators, projectTimestamp } from './feed';

// 📝 FETCH BLOG POSTS:
// Gets all blog articles.
// - If you are previewing locally on your laptop (DEV mode), drafts will show.
// - On the live public website, drafts are hidden!
// - Sorted newest date first.
// - If two posts have the exact same date, breaks ties alphabetically.
// Both listing and route generation use the same publication rule.
export async function posts() {
  // Filter rule: Keep post if in local DEV mode, OR if the post is NOT a draft
  return (await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft)).sort(
    // Sort rule: Newer date first; if equal, sort alphabetically by ID
    (a, b) => b.data.date.getTime() - a.data.date.getTime() || a.id.localeCompare(b.id),
  );
}

// 📷 FETCH PHOTOGRAPHY PROJECTS:
// Gets all photo projects, filters out drafts, and sorts newest first.
export async function projects() {
  return (
    await getCollection('photography', ({ data }) => import.meta.env.DEV || !data.draft)
  ).sort((a, b) => projectTimestamp(b.data) - projectTimestamp(a.data) || a.id.localeCompare(b.id));
}

// 🎬 FETCH POST-PRODUCTION PROJECTS:
// Gets all film & video projects, filters out drafts, and sorts newest first.
export async function postProjects() {
  return (
    await getCollection('postProduction', ({ data }) => import.meta.env.DEV || !data.draft)
  ).sort((a, b) => projectTimestamp(b.data) - projectTimestamp(a.data) || a.id.localeCompare(b.id));
}

// 🏷️ GET ALL UNIQUE CATEGORIES:
// Looks through a list of articles, finds every category label used,
// removes duplicates, and sorts them A-to-Z.
export function categories(entries: { data: { category?: string; categories?: string[] } }[]) {
  return [
    ...new Map(
      entries.flatMap(({ data }) =>
        postCategories(data).map((category) => [categoryKey(category), category] as const),
      ),
    ).values(),
  ].sort();
}

