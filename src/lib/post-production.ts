// ==========================================
// 🎬 VIDEO MAGIC CONVERTER & BLOG CONNECTOR
// ==========================================
// When you want to show a video (from YouTube or Vimeo), you can't just slap
// the normal website address into a player. You need a special "embed" address!
// This file inspects whatever video link or ID you gave it and turns it into
// a clean, privacy-friendly TV screen that plays right on your page.

// Helpers for linking blogs and embedding video URLs

// 🔗 HELPER 1: Safe Blog Link Checker
// If you mention a related blog post for a video project, this checks:
// "Is this blog post actually published and ready?"
// If YES: creates the link `/blog/my-post/`.
// If NO (or still a draft): returns nothing so we don't create a broken link!
export function linkedBlogUrl(slug: string | undefined, published: Set<string>) {
  return slug && published.has(slug) ? `/blog/${slug}/` : undefined;
}

// 📺 HELPER 2: Video Player Embed Maker
// Takes whatever you typed (a full YouTube URL, short link, or raw ID)
// and turns it into the special embed player URL.
export function videoEmbedUrl(input?: string): string | undefined {
  // If nothing was entered, do nothing
  if (!input) return undefined;

  // 1️⃣ Case: Did you paste just the 11-character YouTube video code? (e.g., 'HAkxnRaTW2Q')
  // If so, turn it into YouTube's privacy-friendly (no-cookie) player!
  if (/^[\w-]{11}$/.test(input))
    return `https://www.youtube-nocookie.com/embed/${input}?rel=0&autoplay=1`;

  // 2️⃣ Case: Did you paste just a Vimeo video number? (e.g., '12345678')
  // Turn it into the Vimeo player!
  if (/^\d+$/.test(input)) return `https://player.vimeo.com/video/${input}?autoplay=1`;

  // 3️⃣ Case: You pasted a full web address (like https://www.youtube.com/watch?v=...)
  try {
    const url = new URL(input);
    // Make sure it's a real web link starting with http/https
    if (!['https:', 'http:'].includes(url.protocol)) return undefined;
    
    // Strip "www." so "www.youtube.com" becomes just "youtube.com"
    const host = url.hostname.replace(/^www\./, '');

    // Is it YouTube or youtu.be?
    if (['youtube.com', 'youtube-nocookie.com', 'youtu.be'].includes(host)) {
      // Dig out the video ID from the web address
      const id =
        host === 'youtu.be'
          ? url.pathname.slice(1)
          : url.searchParams.get('v') ||
            url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})\/?$/)?.[1];
      // If we found a valid 11-character ID, build the embed link!
      return id && /^[\w-]{11}$/.test(id) ? videoEmbedUrl(id) : undefined;
    }

    // Is it Vimeo?
    if (['vimeo.com', 'player.vimeo.com'].includes(host)) {
      // Dig out the Vimeo numbers from the web address
      const id = url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1];
      return id ? videoEmbedUrl(id) : undefined;
    }
  } catch {
    /* Invalid URLs do not produce an embedded player. */
  }

  // If it's not a supported video link, return nothing
  return undefined;
}

