// Curate the photography page here. Use an uploaded R2 image address or a local image path.
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
    src: 'https://neiltaylerfilm-images.neiltayler2003.workers.dev/photos/588176e9b85445d319829378ab9beff3-1707.jpeg',
    alt: "One on Wat Arun's spires.",
    width: 1707,
    height: 2561,
  },
  {
    src: 'https://neiltaylerfilm-images.neiltayler2003.workers.dev/photos/9166dbc3bb4042700e5d91ffc339e9d7-1707.jpeg',
    alt: 'A monk paying respect to a statue of an elephant. Taken in Chiang Mai (north Thailand).',
    width: 1707,
    height: 2561,
  },
  {
    src: 'https://neiltaylerfilm-images.neiltayler2003.workers.dev/photos/e367b1de7494198d63e5546d39385fb6-2560.jpeg',
    alt: 'Giant cliffs in Khao Sok National Park tower over a small long tail boat.',
    width: 2560,
    height: 1707,
  },
  {
    src: 'https://neiltaylerfilm-images.neiltayler2003.workers.dev/photos/b71b9161beec951eab42872a403db746-2560.jpeg',
    alt: 'A scene taken at dusk in Khao Sok National Park. Mountains are layered.',
    width: 2560,
    height: 1440,
  },
];
export const featuredIsDemo = false;
