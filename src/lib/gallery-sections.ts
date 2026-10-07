// A heading on a photograph starts a new section; photo order is never changed.
export function gallerySections<T extends { section?: string }>(images: T[]) {
  const groups: { heading?: string; start: number; images: T[] }[] = [];
  images.forEach((image, index) => {
    if (image.section || !groups.length)
      groups.push({ heading: image.section, start: index, images: [] });
    groups[groups.length - 1].images.push(image);
  });
  return groups;
}
