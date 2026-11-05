import { brandIcon } from "@/lib/brand-icon";

export const dynamic = "force-static";

// Written as /apple-touch-icon.png (with extension, so static hosts send the right type).
export const GET = () => brandIcon(180);
