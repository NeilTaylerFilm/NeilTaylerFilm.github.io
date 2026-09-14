import manifest from '../generated/images.json';
type ImageInfo = {
  width: number;
  height: number;
  src: string;
  full: string;
  srcset: string;
  fallbackSrcset: string;
};
export function imageInfo(src: string) {
  const normalized = src
    .replace(/^(?:\.\.\/)+assets\//, '/assets/')
    .replace(/^assets\//, '/assets/');
  return (manifest as Record<string, ImageInfo>)[normalized];
}
