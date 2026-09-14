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
export const featured: FeaturedPhoto[] = [];
export const featuredIsDemo = false;
