import rss from '@astrojs/rss';
import { posts, excerpt } from '../lib/content';
import { site } from '../config/site';

export async function GET(context) {
  return rss({
    title: `${site.name} — Journal`,
    description: site.description,
    site: context.site,
    items: (await posts()).map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: excerpt(post.body, post.data.excerpt),
      link: `/blog/${post.id}/`,
      categories: [post.data.category],
    })),
    customData: '<language>en-gb</language>',
  });
}
