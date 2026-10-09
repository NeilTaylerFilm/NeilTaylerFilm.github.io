// ==========================================
// 📋 THE CONTENT INSPECTOR & RULEBOOK (Content Collections)
// ==========================================
// Think of this file like a friendly editor holding a clipboard!
// Whenever you create a new Markdown file for a Blog post, Photography album,
// or Film project, this file checks:
// "Did you include a title? Is the date formatted correctly? Did you pick a category?"
// If anything is missing or broken, it catches it before the website builds!

// --- BORROWED TOOLS (Imports) ---
// defineCollection: Tells Astro how to set up a new content drawer with strict rules.
import { defineCollection } from 'astro:content';
// glob: A file-finding radar that scans folders for all Markdown (.md/.mdx) documents.
import { glob } from 'astro/loaders';
// z (Zod): A schema validation library that acts like a strict security guard checking forms.
import { z } from 'astro/zod';
// postCategories: Normalizes category names and merges single or multiple category fields.
import { postCategories } from './lib/feed';
// projectDate, projectYear, matchingProjectYear: Custom date validators ensuring consistent timeline years.
import { projectDate, projectYear, matchingProjectYear } from './lib/project-date';

// 🛠️ HELPER: Resilient optional text and date (accepts undefined, null, or empty string from Obsidian)
const optionalText = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

const optionalDate = z.preprocess(
  // A blank date means "no date"; only non-empty values should be checked as dates.
  (val) => (val === null || val === '' ? undefined : val),
  z.coerce.date().optional(),
);

// 📝 COMMON CHECKLIST: Rules that apply to all content items
const common = {
  // Must have a title (cannot be empty text)
  title: z.string().min(1),
  // Optional subtitle
  subtitle: optionalText,
  // Optional post type shown on cards (e.g. 'Explainer', 'Essay', 'Album')
  type: optionalText,
  // Optional summary description
  description: optionalText,
  // Optional social sharing photo
  socialImage: optionalText,
  // If true, hidden from the public website!
  draft: z.boolean().default(false),
  // Optional badge marking demo content
  demo: z.boolean().default(false),
};

// 📰 COLLECTION 1: The Blog Article Rulebook
// Scans all .md and .mdx files in src/content/blog/
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      ...common,
      // Date published (required)
      date: z.coerce.date(),
      // Date last updated (optional)
      updated: optionalDate,
      // Single category (e.g. 'Writing')
      category: optionalText,
      // Or list of categories
      categories: z
        .preprocess(
          (val) => (val === null || val === '' ? undefined : val),
          z.array(z.string().trim().min(1)).min(1).optional(),
        ),
      // Format type (e.g. 'essay')
      format: optionalText,
      // Keyword tags
      tags: z.preprocess(
        (val) => (val === null || val === '' ? [] : val),
        z.array(z.string()).default([]),
      ),
      // Slugs of related posts
      related: z.preprocess(
        (val) => (val === null || val === '' ? [] : val),
        z.array(z.string()).default([]),
      ),
      coverImage: optionalText,
      // Cover photo path
      image: optionalText,
      // Accessibility alt text for cover
      imageAlt: z.string().nullish().transform((v) => v?.trim() || ''),
      // Custom summary teaser
      excerpt: optionalText,
    })
    // 🔍 Rule: Must have at least one category tag
    .refine((data) => postCategories(data).length > 0, {
      message: 'Add at least one category using categories or category',
      path: ['categories'],
    })
    .transform((data) => ({ ...data, categories: postCategories(data) }))
    // 🔍 Rule: An "updated" date cannot happen before the original publish date!
    .refine((data) => !data.updated || data.updated >= data.date, {
      message: 'updated must not precede date',
      path: ['updated'],
    }),
});

// 📷 COLLECTION 2: The Photography Album Rulebook
// Scans all .md files in src/content/photography/
const photography = defineCollection({
  loader: glob({ base: './src/content/photography', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      ...common,
      // 'editorial' or 'justified'
      galleryLayout: z.enum(['editorial', 'justified']).default('editorial'),
      // Calendar date (YYYY-MM-DD)
      date: projectDate.optional(),
      // Or just the 4-digit year (e.g. 2024)
      year: projectYear.optional(),
      // City or country (e.g. 'Kyoto, Japan')
      location: optionalText,
      // Photography style (e.g. 'Street')
      category: optionalText,
      // Multiple categories support
      categories: z.preprocess(
        (val) => (val === null || val === '' ? undefined : val),
        z.array(z.string().trim().min(1)).min(1).optional(),
      ),
      // Cover photo link
      cover: optionalText,
      // Alternative cover image property
      coverImage: optionalText,
      // Alt description for cover
      coverAlt: z.string().nullish().transform((v) => v?.trim() || ''),
      // Put this album on the homepage?
      featured: z.boolean().default(false),
      images: z
        .array(
          z.object({
            // Web address or path to the photo
            src: z.string(),
            // High-res version for zooming
            full: optionalText,
            // Chapter heading
            section: optionalText,
            // Accessibility alt text
            alt: z.string().nullish().transform((v) => v?.trim() || ''),
            // Caption text
            caption: optionalText,
            // Pixel width
            width: z.number().positive().optional(),
            // Pixel height
            height: z.number().positive().optional(),
          }),
        )
        .default([]),
    })
    // 🔍 Rule: If both year and date are given, they must agree!
    .refine(matchingProjectYear, { message: 'year must match date, or omit year', path: ['year'] })
    // Merge category/categories into one deduplicated list
    .transform((data) => ({ ...data, categories: postCategories(data) })),
});

// 🎬 COLLECTION 3: The Post-Production & Film Rulebook
// Scans all .md files in src/content/post-production/
const postProduction = defineCollection({
  loader: glob({ base: './src/content/post-production', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      ...common,
      // Calendar date (YYYY-MM-DD)
      date: projectDate.optional(),
      // Year (e.g. 2024)
      year: projectYear.optional(),
      // Discipline (e.g. 'Editing', 'VFX')
      category: optionalText,
      // Multiple categories support
      categories: z
        .preprocess(
          (val) => (val === null || val === '' ? undefined : val),
          z.array(z.string().trim().min(1)).min(1).optional(),
        ),
      // Cover image
      cover: optionalText,
      // Cover image alternate
      coverImage: optionalText,
      // Your roles (e.g. ['Director', 'Colorist'])
      roles: z.preprocess(
        (val) => (val === null || val === '' ? [] : val),
        z.array(z.string().trim().min(1)).default([]),
      ),
      // Type of project (e.g. 'Music Video')
      projectType: optionalText,
      video: optionalText, // URL or ID for video (YouTube, Vimeo, etc.)
      poster: optionalText, // Custom poster image for video
      // Feature on showcase carousel?
      featured: z.boolean().default(false),
      images: z
        .array(
          z.object({
            src: z.string(),
            alt: z.string().nullish().transform((v) => v?.trim() || ''),
            caption: optionalText,
            width: z.number().positive().optional(),
            height: z.number().positive().optional(),
          }),
        )
        .default([]),
      relatedPosts: z.preprocess(
        (val) => (val === null || val === '' ? [] : val),
        z.array(z.string()).default([]),
      ), // Array of blog post slugs
    })
    // 🔍 Rule: Year and date must not contradict each other
    .refine(matchingProjectYear, { message: 'year must match date, or omit year', path: ['year'] })
    // Merge category/categories into one deduplicated list
    .transform((data) => ({ ...data, categories: postCategories(data) })),
});

// 📦 Export all collections so Astro knows about them
export const collections = { blog, photography, postProduction };

