// ==========================================
// 🖼️ IMAGE ROLODEX (Picture Size & Version Lookup)
// ==========================================
// When you put a picture on your site, we don't want a phone to download
// a gigantic 50-megabyte file! So our build system generates small, medium,
// and large versions of each photo.
// This file is like a Rolodex that looks up the exact sizes and links for any picture.

// Helper to look up responsive image info from the generated manifest
// --- BORROWED TOOLS (Imports) ---
// 📚 Load the giant book that lists all generated image sizes
// This JSON manifest is generated automatically by scripts/prepare-images.mjs during build.
import manifest from '../generated/images.json';

// 📋 The "Fact Sheet" for a single picture:
type ImageInfo = {
  // How wide it is in pixels
  width: number;
  // How tall it is in pixels
  height: number;
  // The main picture web address
  src: string;
  // The super crisp, high-res version
  full: string;
  // A list of different sizes for modern screens (AVIF/WebP)
  srcset: string;
  // A backup list for older browsers (standard JPEG)
  fallbackSrcset: string;
};

// 🔍 THE LOOKUP FUNCTION:
// Give it an image path (like "../assets/photo.jpg"), and it hands back the full fact sheet!
// What goes in: Any image path string from markdown or frontmatter.
// What comes out: An ImageInfo object with dimensions and responsive WebP srcsets, or undefined.
export function imageInfo(src: string) {
  // 🧹 Clean up the path so it always starts nicely with "/assets/"
  // (stripping out any confusing dots like "../..")
  const normalized = src
    .replace(/^(?:\.\.\/)+assets\//, '/assets/')
    .replace(/^assets\//, '/assets/');
  // 📖 Look up the cleaned name in our giant book and return the info!
  return (manifest as Record<string, ImageInfo>)[normalized];
}

