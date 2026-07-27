import { ImageResponse } from "next/og";
import { dashboardMark } from "@/lib/pwaIcon";

export async function GET() {
  return new ImageResponse(dashboardMark({ size: 192, radius: 40 }), {
    width: 192,
    height: 192,
  });
}
