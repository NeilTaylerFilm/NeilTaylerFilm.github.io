export function linkedBlogUrl(slug: string | undefined, published: Set<string>) {
  return slug && published.has(slug) ? `/blog/${slug}/` : undefined;
}

export function videoEmbedUrl(input?: string): string | undefined {
  if (!input) return undefined;
  if (/^[\w-]{11}$/.test(input))
    return `https://www.youtube-nocookie.com/embed/${input}?rel=0&autoplay=1`;
  if (/^\d+$/.test(input)) return `https://player.vimeo.com/video/${input}?autoplay=1`;
  try {
    const url = new URL(input);
    if (!['https:', 'http:'].includes(url.protocol)) return undefined;
    const host = url.hostname.replace(/^www\./, '');
    if (['youtube.com', 'youtube-nocookie.com', 'youtu.be'].includes(host)) {
      const id =
        host === 'youtu.be'
          ? url.pathname.slice(1)
          : url.searchParams.get('v') ||
            url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})\/?$/)?.[1];
      return id && /^[\w-]{11}$/.test(id) ? videoEmbedUrl(id) : undefined;
    }
    if (['vimeo.com', 'player.vimeo.com'].includes(host)) {
      const id = url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1];
      return id ? videoEmbedUrl(id) : undefined;
    }
  } catch {
    /* Invalid URLs do not produce an embedded player. */
  }
  return undefined;
}
