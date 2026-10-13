import { z } from 'astro/zod';

export const roleMetadataSchema = z.array(z.string().trim().min(1)).optional();
