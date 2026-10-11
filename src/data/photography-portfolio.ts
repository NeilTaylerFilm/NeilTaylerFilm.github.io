import { featured } from './featured.ts';

export type PortfolioPhoto = {
  src: string;
  width: number;
  height: number;
  alt: string;
  projectSlug?: string;
};

export const portfolioPhotos: PortfolioPhoto[] = featured.map((photo) => ({
  src: photo.src,
  width: photo.width,
  height: photo.height,
  alt: photo.alt,
  ...(photo.project ? { projectSlug: photo.project } : {}),
}));

export function validatePortfolio(
  photos: PortfolioPhoto[],
  publishedSlugs: Set<string>,
  dimensions: (src: string) => { width: number; height: number } | undefined,
) {
  if (photos.length > 72) throw new Error('The photography portfolio supports up to 72 photos.');
  for (const photo of photos) {
    const info = dimensions(photo.src);
    if (!info) throw new Error(`Portfolio image has no responsive exports: ${photo.src}`);
    if (
      ![photo.width, photo.height].every((value) => Number.isFinite(value) && value > 0) ||
      photo.width !== info.width ||
      photo.height !== info.height
    ) {
      throw new Error(`Portfolio image dimensions do not match its exports: ${photo.src}`);
    }
    if (!photo.alt.trim()) throw new Error(`Portfolio image needs alt text: ${photo.src}`);
    if (photo.projectSlug && !publishedSlugs.has(photo.projectSlug)) {
      throw new Error(`Portfolio project is not published: ${photo.projectSlug}`);
    }
  }
}
