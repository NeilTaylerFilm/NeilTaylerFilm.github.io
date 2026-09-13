interface SiteConfig {
  name: string;
  author: string;
  description: string;
  tagline: string;
  defaultImage: string;
  email: string;
  links: { label: string; url: string }[];
}
export const site: SiteConfig = {
  name: 'Neil Tayler',
  author: 'Neil Tayler',
  description:
    'Notes on images, ideas and everything in between. Writing and photography by Neil Tayler.',
  tagline: 'Images. Ideas. Everything in between.',
  defaultImage: '/images/social-card.png',
  email: '', // Add your real email address here.
  links: [
    { label: 'Instagram', url: '' },
    { label: 'LinkedIn', url: '' },
    { label: 'GitHub', url: '' },
  ],
};
