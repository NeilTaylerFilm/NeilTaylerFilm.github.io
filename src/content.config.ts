import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Blog collection
const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			subtitle: z.string().optional(),
			date: z.coerce.date(),
			category: z.string(),
			image: z.string().optional(),
			excerpt: z.string().optional(),
			draft: z.boolean().optional().default(false),
		}),
});

// Photography projects collection
const photography = defineCollection({
	loader: glob({ base: './src/content/photography', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			subtitle: z.string().optional(),
			date: z.coerce.date(),
			category: z.string(),
			cover: z.string().optional(),
			images: z.array(z.object({
				src: z.string(),
				alt: z.string().optional(),
				width: z.number().optional(),
				height: z.number().optional(),
				caption: z.string().optional(),
			})).optional(),
			draft: z.boolean().optional().default(false),
		}),
});

export const collections = { blog, photography };