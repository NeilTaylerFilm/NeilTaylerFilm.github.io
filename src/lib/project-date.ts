// ==========================================
// 📅 PROJECT DATE DETECTIVE (Calendar Checker)
// ==========================================
// Think of this file like a friendly bouncer at a calendar club!
// When you write a blog post or upload photos, this makes sure
// you wrote a REAL date (like 2024-06-15) and didn't accidentally type
// something impossible like February 31st or year 99999.

// Helpers for validating and matching project dates and years
import { z } from 'astro/zod';

// 🔍 RULE 1: The Exact Date Checker
// Calendar dates only: never interpret a local-time string or normalise an impossible day.
// 1. Must look like four numbers, a dash, two numbers, a dash, two numbers (YYYY-MM-DD).
// 2. Must exist on a real calendar (catches fake dates like Feb 30th).
// 3. Turns the text into a real digital clock timestamp so the computer understands it.
export const projectDate = z
  .string()
  .regex(/^[1-9]\d{3}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Use a real calendar date in YYYY-MM-DD format')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

// 🗓️ RULE 2: The Year Checker
// Checks that a year is a 4-digit number (like 2024), either written as a number or in quotes.
export const projectYear = z.union([
  z.number().int().min(1000).max(9999),
  z.string().regex(/^[1-9]\d{3}$/),
]);

// 🤝 RULE 3: Do the Date and Year Agree?
// If you gave both a full date (e.g. 2024-05-10) and a year (e.g. 2024),
// this function makes sure they don't contradict each other!
export function matchingProjectYear(data: { date?: Date; year?: string | number }) {
  return !data.date || data.year === undefined || data.date.getUTCFullYear() === Number(data.year);
}

