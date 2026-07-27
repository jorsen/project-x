import { ImageResponse } from "next/og";
import { dashboardMark } from "@/lib/pwaIcon";

// Maskable icons get cropped to a circle (or squircle, etc.) by the OS, so
// keep the mark well inside the ~80% "safe zone" with extra padding, and no
// rounded corners of our own since the OS applies its own mask shape.
export async function GET() {
  return new ImageResponse(
    dashboardMark({ size: 512, radius: 0, padding: 512 * 0.28 }),
    { width: 512, height: 512 },
  );
}
