// Curate the photography page here. Paths are relative to public/.
// Project is the Markdown filename (without .md). Omit it for an unlinked image.
type FeaturedPhoto = {
  src: string;
  alt: string;
  caption?: string;
  project?: string;
  width: number;
  height: number;
};
export const featured: FeaturedPhoto[] = [
  {
    src: 'assets/demo/lake.jpg',
    alt: 'An alpine lake reflecting mountain peaks and a small lakeside building',
    caption: 'Still water, open space',
    project: 'quiet-places',
    width: 1600,
    height: 1067,
  },
  {
    src: 'assets/demo/forest.jpg',
    alt: 'Sunlight falling through tall trees in a forest',
    caption: 'Between the trees',
    project: 'quiet-places',
    width: 1600,
    height: 1067,
  },
  {
    src: 'assets/demo/coast.jpg',
    alt: 'Small blue ocean waves seen at water level beneath a pale sky',
    caption: 'Along the water',
    project: 'passing-through',
    width: 1600,
    height: 1067,
  },
];
export const featuredIsDemo = true; // Set false once these are your own photographs.
