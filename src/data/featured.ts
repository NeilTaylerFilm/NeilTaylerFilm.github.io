// ==========================================
// 🌟 FEATURED PHOTOGRAPHY SHOWCASE
// ==========================================
// This file is your museum gallery wall!
// The photographs listed here will be front and center in the slideshow
// on your Photography portfolio page.

// Curated list of featured photography projects for the portfolio page.
// Curate the photography page here. Use an uploaded R2 image address or a local image path.
// Project is the Markdown filename (without .md). Omit it for an unlinked image.
// This list is imported directly by src/components/PhotographySlideshow.astro.

// 📋 The checklist of what each featured picture needs:
type FeaturedPhoto = {
  // Full high-resolution picture web link
  src: string;
  // Optional tiny thumbnail for the bottom filmstrip
  thumbnail?: string;
  // Description of what's in the photo (for accessibility)
  alt: string;
  // Optional subtitle text displayed under the photo
  caption?: string;
  // Optional project name to link to (e.g. 'japan-2024')
  project?: string;
  // Pixel width (helps browser reserve the right aspect ratio)
  width: number;
  // Pixel height
  height: number;
};

// 🖼️ The list of featured photos to show on the site:
export const featured: FeaturedPhoto[] = [
  {
    src: 'https://neiltaylerfilm-images.neiltayler2003.workers.dev/photos/588176e9b85445d319829378ab9beff3-1707.jpeg',
    thumbnail: '/images/photography-thumbnails/588176e9b85445d319829378ab9beff3.webp',
    alt: "One on Wat Arun's spires.",
    width: 1707,
    height: 2561,
  },
  {
    src: 'https://neiltaylerfilm-images.neiltayler2003.workers.dev/photos/9166dbc3bb4042700e5d91ffc339e9d7-1707.jpeg',
    thumbnail: '/images/photography-thumbnails/9166dbc3bb4042700e5d91ffc339e9d7.webp',
    alt: 'A monk paying respect to a statue of an elephant. Taken in Chiang Mai (north Thailand).',
    width: 1707,
    height: 2561,
  },
  {
    src: 'https://neiltaylerfilm-images.neiltayler2003.workers.dev/photos/e367b1de7494198d63e5546d39385fb6-2560.jpeg',
    thumbnail: '/images/photography-thumbnails/e367b1de7494198d63e5546d39385fb6.webp',
    alt: 'Giant cliffs in Khao Sok National Park tower over a small long tail boat.',
    width: 2560,
    height: 1707,
  },
  {
    src: 'https://neiltaylerfilm-images.neiltayler2003.workers.dev/photos/b71b9161beec951eab42872a403db746-2560.jpeg',
    thumbnail: '/images/photography-thumbnails/b71b9161beec951eab42872a403db746.webp',
    alt: 'A scene taken at dusk in Khao Sok National Park. Mountains are layered.',
    width: 2560,
    height: 1440,
  },
];

// 🚩 Flag that tells the site: "These are your real photos, not test/demo placeholders!"
export const featuredIsDemo = false;

