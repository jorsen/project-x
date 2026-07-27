import { ImageResponse } from "next/og";
import { dashboardMark } from "@/lib/pwaIcon";

export async function GET() {
  return new ImageResponse(dashboardMark({ size: 512, radius: 106 }), {
    width: 512,
    height: 512,
  });
}
