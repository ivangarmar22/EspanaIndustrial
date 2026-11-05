import { resizedImagePath } from "./media";

/** next/image loader for the static export: serves the pre-sized copies of the Commons photos. */
export default function imageLoader({ src, width }: { src: string; width: number }): string {
  return resizedImagePath(src, width);
}
