import { z } from 'astro/zod';

// Calendar dates only: never interpret a local-time string or normalise an impossible day.
export const projectDate = z
  .string()
  .regex(/^[1-9]\d{3}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Use a real calendar date in YYYY-MM-DD format')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

export const projectYear = z.union([
  z.number().int().min(1000).max(9999),
  z.string().regex(/^[1-9]\d{3}$/),
]);

export function matchingProjectYear(data: { date?: Date; year?: string | number }) {
  return !data.date || data.year === undefined || data.date.getUTCFullYear() === Number(data.year);
}
