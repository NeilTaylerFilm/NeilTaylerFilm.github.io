import manifest from '../generated/images.json';
type ImageInfo = { width: number; height: number; srcset: string };
export function imageInfo(src: string) {
  return (manifest as Record<string, ImageInfo>)[src];
}
