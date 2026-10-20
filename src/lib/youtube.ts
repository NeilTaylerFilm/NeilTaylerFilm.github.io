const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
]);

/** Return a video ID only for a raw ID or a supported HTTPS YouTube URL. */
export function youtubeVideoId(source: string): string | undefined {
  const value = source.trim();
  if (VIDEO_ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash)
    return undefined;

  if (url.hostname === 'youtu.be') {
    const segments = url.pathname.split('/').filter(Boolean);
    return segments.length === 1 && VIDEO_ID.test(segments[0]) ? segments[0] : undefined;
  }

  if (!YOUTUBE_HOSTS.has(url.hostname)) return undefined;

  if (url.pathname === '/watch') {
    const ids = url.searchParams.getAll('v');
    return ids.length === 1 && VIDEO_ID.test(ids[0]) ? ids[0] : undefined;
  }

  const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/);
  return match?.[1];
}

function assertVideoId(videoId: string) {
  if (!VIDEO_ID.test(videoId)) throw new TypeError('Expected an 11-character YouTube video ID.');
}

export function youtubeEmbedUrl(videoId: string) {
  assertVideoId(videoId);
  const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  url.searchParams.set('autoplay', '1');
  url.searchParams.set('controls', '1');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('rel', '0');
  return url.toString();
}

export function youtubeWatchUrl(videoId: string) {
  assertVideoId(videoId);
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeThumbnailUrl(videoId: string) {
  assertVideoId(videoId);
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function isYoutubeThumbnailPlaceholder(
  image: Pick<HTMLImageElement, 'naturalWidth' | 'naturalHeight'>,
) {
  return image.naturalWidth === 120 && image.naturalHeight === 90;
}
