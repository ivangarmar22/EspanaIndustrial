/**
 * Sizes of the Commons photos. The originals in public/media/commons (up to 5 MB) are
 * copied by scripts/maintenance/optimize-media.ts into <width>/<name>.webp for the page
 * (picked by image-loader.ts) and og/<name>.jpg for link previews.
 */
export const IMAGE_WIDTHS = [320, 640, 1080, 1600];
export const SOCIAL_IMAGE_WIDTH = 1200;

const COMMONS = /^(.*\/media\/commons\/)([^/]+)\.(?:jpe?g|png|webp)$/i;

export function resizedImagePath(src: string, width: number): string {
  const m = COMMONS.exec(src);
  if (!m) return src;
  const w = IMAGE_WIDTHS.find((x) => x >= width) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
  return `${m[1]}${w}/${m[2]}.webp`;
}

/** JPEG copy for Open Graph and JSON-LD: some apps reject WebP or images over ~600 KB. */
export function socialImagePath(src: string): string {
  const m = COMMONS.exec(src);
  return m ? `${m[1]}og/${m[2]}.jpg` : src;
}
