// src/pages/rss.xml.js
// RSS feed for blog posts
import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts.ts';

export async function GET(context) {
  const posts = await getCollection('blog');
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.excerpt || post.data.title,
      pubDate: post.data.date,
      link: `/blog/${post.slug}/`,
      // Optional: add categories if you want
      // categories: post.data.tags ?? [],
    })),
  });
}