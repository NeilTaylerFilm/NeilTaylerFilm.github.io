// ==========================================
// 📋 THE CONTENT INSPECTOR & RULEBOOK (Content Collections)
// ==========================================
// Think of this file like a friendly editor holding a clipboard!
// Whenever you create a new Markdown file for a Blog post, Photography album,
// or Film project, this file checks:
// "Did you include a title? Is the date formatted correctly? Did you pick a category?"
// If anything is missing or broken, it catches it before the website builds!

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { postCategories } from './lib/feed';
import { projectDate, projectYear, matchingProjectYear } from './lib/project-date';

// 📝 COMMON CHECKLIST: Rules that apply to all content items
const common = {
  title: z.string().min(1),             // Must have a title (cannot be empty text)
  subtitle: z.string().optional(),      // Optional subtitle
  description: z.string().optional(),   // Optional summary description
  socialImage: z.string().optional(),   // Optional social sharing photo
  draft: z.boolean().default(false),    // If true, hidden from the public website!
  demo: z.boolean().default(false),     // Optional badge marking demo content
};

// 📰 COLLECTION 1: The Blog Article Rulebook
// Scans all .md and .mdx files in src/content/blog/
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      ...common,
      date: z.coerce.date(),                            // Date published (required)
      updated: z.coerce.date().optional(),              // Date last updated (optional)
      category: z.string().trim().min(1).optional(),    // Single category (e.g. 'Writing')
      categories: z.array(z.string().trim().min(1)).min(1).optional(), // Or list of categories
      format: z.string().optional(),                    // Format type (e.g. 'essay')
      tags: z.array(z.string()).default([]),            // Keyword tags
      related: z.array(z.string()).default([]),          // Slugs of related posts
      image: z.string().optional(),                     // Cover photo path
      imageAlt: z.string().default(''),                 // Accessibility alt text for cover
      excerpt: z.string().optional(),                   // Custom summary teaser
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
      galleryLayout: z.enum(['editorial', 'justified']).default('editorial'), // 'editorial' or 'justified'
      date: projectDate.optional(),                     // Calendar date (YYYY-MM-DD)
      year: projectYear.optional(),                     // Or just the 4-digit year (e.g. 2024)
      location: z.string().optional(),                  // City or country (e.g. 'Kyoto, Japan')
      category: z.string().trim().min(1).optional(),    // Photography style (e.g. 'Street')
      cover: z.string().optional(),                     // Cover photo link
      coverImage: z.string().optional(),                // Alternative cover image property
      coverAlt: z.string().default(''),                 // Alt description for cover
      featured: z.boolean().default(false),             // Put this album on the homepage?
      images: z
        .array(
          z.object({
            src: z.string(),                            // Web address or path to the photo
            full: z.string().optional(),                // High-res version for zooming
            section: z.string().trim().min(1).optional(), // Chapter heading
            alt: z.string().default(''),                // Accessibility alt text
            caption: z.string().optional(),             // Caption text
            width: z.number().positive().optional(),    // Pixel width
            height: z.number().positive().optional(),   // Pixel height
          }),
        )
        .default([]),
    })
    // 🔍 Rule: If both year and date are given, they must agree!
    .refine(matchingProjectYear, { message: 'year must match date, or omit year', path: ['year'] }),
});

// 🎬 COLLECTION 3: The Post-Production & Film Rulebook
// Scans all .md files in src/content/post-production/
const postProduction = defineCollection({
  loader: glob({ base: './src/content/post-production', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      ...common,
      date: projectDate.optional(),                     // Calendar date (YYYY-MM-DD)
      year: projectYear.optional(),                     // Year (e.g. 2024)
      category: z.string().trim().min(1).optional(),    // Discipline (e.g. 'Editing', 'VFX')
      cover: z.string().optional(),                     // Cover image
      coverImage: z.string().optional(),                // Cover image alternate
      roles: z.array(z.string()).default([]),           // Your roles (e.g. ['Director', 'Colorist'])
      projectType: z.string().optional(),               // Type of project (e.g. 'Music Video')
      video: z.string().optional(),                     // URL or ID for video (YouTube, Vimeo, etc.)
      poster: z.string().optional(),                    // Custom poster image for video
      featured: z.boolean().default(false),             // Feature on showcase carousel?
      images: z
        .array(
          z.object({
            src: z.string(),
            alt: z.string().default(''),
            caption: z.string().optional(),
            width: z.number().positive().optional(),
            height: z.number().positive().optional(),
          }),
        )
        .default([]),
      relatedPosts: z.array(z.string()).default([]),    // Array of blog post slugs
    })
    // 🔍 Rule: Year and date must not contradict each other
    .refine(matchingProjectYear, { message: 'year must match date, or omit year', path: ['year'] }),
});

// 📦 Export all collections so Astro knows about them
export const collections = { blog, photography, postProduction };

