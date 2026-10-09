// ==========================================
// ☁️ CLOUDFLARE IMAGE BUTLER (cloudflare/image-worker.mjs)
// ==========================================
// Think of this file like a secure warehouse butler for your photographs!
// 1. When a visitor's browser asks for a picture (like "photos/sunset-800.webp"),
//    this butler fetches it from your private Cloudflare R2 storage locker.
// 2. It checks visitor IDs (only allows viewing, never unauthorized editing).
// 3. It tells the visitor's browser: "Keep this saved in your cache so you don't
//    have to download it again next time!"

// Serves photos from R2 for public delivery
// Public delivery only. Upload photos through authenticated Cloudflare tools.
// Bind the dedicated R2 bucket as IMAGES in the Worker dashboard.

// 🏷️ File label dictionary: Maps file endings (like .webp) to official web image types
const types = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  png: 'image/png',
};

export default {
  // 🚪 The main door: Runs whenever someone requests an image URL
  // What goes in: request (incoming HTTP request), env (Cloudflare bindings including R2 bucket)
  // What comes out: HTTP Response containing image bytes and headers, or 404/405 error
  async fetch(request, env) {
    // 🛑 Rule 1: Only allow looking (GET) or checking file size (HEAD). No uploading or deleting!
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }

    // 📍 Find which specific photo they are asking for
    const key = new URL(request.url).pathname.slice(1);

    // 🔒 Rule 2: Security lock! Only allow files inside the "photos/" folder with safe picture endings.
    // Only explicitly published raster pictures under photos/ are exposed.
    if (!/^photos\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(jpg|jpeg|webp|avif|png)$/.test(key)) {
      return new Response('Not found', { status: 404 });
    }

    // 📦 Reach into the R2 storage locker (env.IMAGES) to grab the photo
    const object =
      request.method === 'HEAD' ? await env.IMAGES.head(key) : await env.IMAGES.get(key);

    // ❓ If the photo doesn't exist, tell them 404 (Not Found)
    if (!object) return new Response('Not found', { status: 404 });

    // 📋 Prepare shipping label (HTTP headers) for the browser
    const headers = new Headers({
      // Image type (e.g. image/webp)
      'Content-Type': types[key.split('.').pop()],
      // Exact file size in bytes
      'Content-Length': String(object.size),
      // Unique fingerprint of this exact file version
      ETag: object.httpEtag,
      // ⚡ Caching rule: If the filename has a unique hash, save in browser for a whole year!
      // Otherwise, save for 24 hours.
      'Cache-Control': /^photos\/[a-f0-9]{32}-\d+\.(jpeg|webp)$/.test(key)
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=86400',
      // Safety tag: stops browser from guessing wrong file types
      'X-Content-Type-Options': 'nosniff',
    });

    // 🚀 Hand the photo data over to the visitor's browser!
    // Browser caching works on workers.dev; do not assume CDN Cache API caching.
    return new Response(request.method === 'HEAD' ? null : object.body, { headers });
  },
};
