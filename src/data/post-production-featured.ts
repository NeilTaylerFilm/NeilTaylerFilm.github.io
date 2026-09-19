// Curate the post-production page here. Use an uploaded R2 image address or a local image path.
// Video can be a YouTube or Vimeo URL/ID. Project is the Markdown filename (without .md).
type FeaturedWork = {
  src: string;
  alt: string;
  caption?: string;
  project?: string;
  blogPost?: string; // Published blog filename without .md; omit until ready.
  video?: string; // YouTube/Vimeo URL or ID (optional)
  poster?: string; // Custom poster for video (optional)
  width: number;
  height: number;
};
export const featured: FeaturedWork[] = [
  {
    src: 'https://i.ytimg.com/vi/HAkxnRaTW2Q/hqdefault.jpg',
    alt: 'A Song To Be Murdered By — short film',
    caption: 'A Song To Be Murdered By',
    video: 'https://www.youtube.com/watch?v=HAkxnRaTW2Q',
    width: 480,
    height: 360,
    // blogPost: 'your-blog-post-filename',
  },
  {
    src: 'https://i.ytimg.com/vi/3GgTC-an6Mw/hqdefault.jpg',
    alt: 'On Dover Beach — Cinematography module submission',
    caption: 'On Dover Beach',
    video: 'https://youtu.be/3GgTC-an6Mw',
    width: 480,
    height: 360,
  },
  {
    src: 'https://i.ytimg.com/vi/6RO60JMBuQc/hqdefault.jpg',
    alt: 'On In Five — five-minute short film for the Fiction Film module',
    caption: 'On In Five',
    video: 'https://youtu.be/6RO60JMBuQc',
    width: 480,
    height: 360,
  },
  {
    src: 'https://i.ytimg.com/vi/v0dJIPj3vX0/hqdefault.jpg',
    alt: 'Two Pints Deep — documentary for the Creative Storytelling module',
    caption: 'Two Pints Deep',
    video: 'https://youtu.be/v0dJIPj3vX0',
    width: 480,
    height: 360,
  },
  {
    src: 'https://i.ytimg.com/vi/H2tpEutlqVo/hqdefault.jpg',
    alt: 'VFX Reel — final submission for the Post Production VFX module',
    caption: 'VFX Reel',
    video: 'https://youtu.be/H2tpEutlqVo',
    width: 480,
    height: 360,
  },
];
export const featuredIsDemo = false;
