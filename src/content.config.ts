import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const common = {
  title: z.string().trim().min(1),
  date: z.coerce.date(),
  category: z.string().trim().min(1),
  subtitle: z.string().trim().optional(),
  draft: z.boolean().default(false),
  demo: z.boolean().default(false),
};
const photo = z.object({
  src: z.string().min(1),
  alt: z.string().trim().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: z.string().optional(),
});
const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    ...common,
    image: z.string().optional(),
    imageAlt: z.string().default(''),
    excerpt: z.string().optional(),
  }),
});
const photography = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/photography' }),
  schema: z
    .object({
      ...common,
      cover: z.string().optional(),
      coverAlt: z.string().default(''),
      images: z.array(photo).default([]),
    })
    .superRefine((project, context) => {
      if (!project.draft && !project.cover)
        context.addIssue({
          code: 'custom',
          path: ['cover'],
          message: 'Published projects need a cover image.',
        });
      if (!project.draft && project.images.length === 0)
        context.addIssue({
          code: 'custom',
          path: ['images'],
          message: 'Published projects need at least one gallery image.',
        });
    }),
});
export const collections = { blog, photography };
