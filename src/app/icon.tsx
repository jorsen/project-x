import { ImageResponse } from "next/og";
import { dashboardMark } from "@/lib/pwaIcon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(dashboardMark({ size: 32, radius: 7 }), size);
}
