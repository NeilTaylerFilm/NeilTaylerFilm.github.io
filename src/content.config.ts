import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { postCategories } from './lib/feed';
import { projectDate, projectYear, matchingProjectYear } from './lib/project-date';

const common = {
  title: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  socialImage: z.string().optional(),
  draft: z.boolean().default(false),
  demo: z.boolean().default(false),
};
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      ...common,
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      category: z.string().trim().min(1).optional(),
      categories: z.array(z.string().trim().min(1)).min(1).optional(),
      format: z.string().optional(),
      tags: z.array(z.string()).default([]),
      related: z.array(z.string()).default([]),
      image: z.string().optional(),
      imageAlt: z.string().default(''),
      excerpt: z.string().optional(),
    })
    .refine((data) => postCategories(data).length > 0, {
      message: 'Add at least one category using categories or category',
      path: ['categories'],
    })
    .transform((data) => ({ ...data, categories: postCategories(data) }))
    .refine((data) => !data.updated || data.updated >= data.date, {
      message: 'updated must not precede date',
      path: ['updated'],
    }),
});
const photography = defineCollection({
  loader: glob({ base: './src/content/photography', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      ...common,
      galleryLayout: z.enum(['editorial', 'justified']).default('editorial'),
      date: projectDate.optional(),
      year: projectYear.optional(),
      location: z.string().optional(),
      category: z.string().trim().min(1).optional(),
      cover: z.string().optional(),
      coverImage: z.string().optional(),
      coverAlt: z.string().default(''),
      featured: z.boolean().default(false),
      images: z
        .array(
          z.object({
            src: z.string(),
            full: z.string().optional(),
            alt: z.string().default(''),
            caption: z.string().optional(),
            width: z.number().positive().optional(),
            height: z.number().positive().optional(),
          }),
        )
        .default([]),
    })
    .refine(matchingProjectYear, { message: 'year must match date, or omit year', path: ['year'] }),
});
const postProduction = defineCollection({
  loader: glob({ base: './src/content/post-production', pattern: '**/*.{md,mdx}' }),
  schema: z
    .object({
      ...common,
      date: projectDate.optional(),
      year: projectYear.optional(),
      category: z.string().trim().min(1).optional(),
      cover: z.string().optional(),
      coverImage: z.string().optional(),
      roles: z.array(z.string()).default([]),
      projectType: z.string().optional(),
      video: z.string().optional(), // URL or ID for video (YouTube, Vimeo, etc.)
      poster: z.string().optional(), // Custom poster image for video
      featured: z.boolean().default(false),
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
      relatedPosts: z.array(z.string()).default([]), // Array of blog post slugs
    })
    .refine(matchingProjectYear, { message: 'year must match date, or omit year', path: ['year'] }),
});
export const collections = { blog, photography, postProduction };
