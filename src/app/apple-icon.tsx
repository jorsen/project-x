import { ImageResponse } from "next/og";
import { dashboardMark } from "@/lib/pwaIcon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(dashboardMark({ size: 180, radius: 38 }), size);
}
