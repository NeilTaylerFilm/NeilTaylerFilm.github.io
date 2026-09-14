interface SiteConfig {
  name: string;
  author: string;
  description: string;
  tagline: string;
  defaultImage: string;
  email: string;
  links: { label: string; url: string; username: string }[];
}
export const site: SiteConfig = {
  name: 'Neil Tayler Film',
  author: 'Neil Tayler',
  description:
    'Notes on images, ideas and everything in between. Writing and photography by Neil Tayler.',
  tagline: 'Images. Ideas. Everything in between.',
  defaultImage: '/images/social-card.png',
  email: 'tayler.neil@icloud.com',
  links: [
    {
      label: 'Instagram',
      url: 'https://www.instagram.com/neiltaylerfilm/',
      username: '@neiltaylerfilm',
    },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/neil-tayler/', username: 'neil-tayler' },
  ],
};
