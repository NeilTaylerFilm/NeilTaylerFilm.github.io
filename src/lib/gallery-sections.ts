// ==========================================
// 📖 PHOTO ALBUM CHAPTER ORGANIZER
// ==========================================
// Imagine you have a big pile of printed photographs.
// Sometimes you stick a little bookmark on a photo that says "Tokyo Day 1",
// and a few photos later another bookmark says "Kyoto Day 2".
// This helper takes that pile and groups the photos into neat chapter binders,
// keeping all photos in the exact order you took them!

// Helper to group gallery images into sections by heading
// A heading on a photograph starts a new section; photo order is never changed.
export function gallerySections<T extends { section?: string }>(images: T[]) {
  // 🗂️ This will hold all of our finished photo binders (chapters)
  const groups: { heading?: string; start: number; images: T[] }[] = [];
  
  // 🚶 Walk through every photograph one by one
  images.forEach((image, index) => {
    // If this photo has a new chapter title, or if we haven't started a binder yet:
    // start a brand new binder!
    if (image.section || !groups.length)
      groups.push({ heading: image.section, start: index, images: [] });
    // Slip this photograph into the current binder
    groups[groups.length - 1].images.push(image);
  });
  
  // 🎁 Hand back the finished list of binders
  return groups;
}

