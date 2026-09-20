// Public delivery only. Upload photos through authenticated Cloudflare tools.
// Bind the dedicated R2 bucket as IMAGES in the Worker dashboard.
const types = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  png: 'image/png',
};

export default {
  async fetch(request, env) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    const key = new URL(request.url).pathname.slice(1);
    // Only explicitly published raster pictures under photos/ are exposed.
    if (!/^photos\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(jpg|jpeg|webp|avif|png)$/.test(key)) {
      return new Response('Not found', { status: 404 });
    }
    const object =
      request.method === 'HEAD' ? await env.IMAGES.head(key) : await env.IMAGES.get(key);
    if (!object) return new Response('Not found', { status: 404 });
    const headers = new Headers({
      'Content-Type': types[key.split('.').pop()],
      'Content-Length': String(object.size),
      ETag: object.httpEtag,
      'Cache-Control': /^photos\/[a-f0-9]{32}-\d+\.(jpeg|webp)$/.test(key)
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    });
    // Browser caching works on workers.dev; do not assume CDN Cache API caching.
    return new Response(request.method === 'HEAD' ? null : object.body, { headers });
  },
};
