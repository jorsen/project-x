// Renders the app's mark (matching the sidebar/login logo — an indigo square
// with a white 2x2 grid) as a JSX tree for `next/og`'s ImageResponse. Built
// from plain flexbox only (no CSS grid) since satori's CSS support is
// flexbox-first.
export function dashboardMark({
  size,
  radius,
  padding = size * 0.22,
  bg = "#4f46e5",
  fg = "#ffffff",
  transparentBg = false,
}: {
  size: number;
  radius: number;
  padding?: number;
  bg?: string;
  fg?: string;
  transparentBg?: boolean;
}) {
  const inner = size - padding * 2;
  const gap = Math.max(2, inner * 0.14);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: transparentBg ? "transparent" : bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: inner,
          height: inner,
          gap,
        }}
      >
        <div style={{ display: "flex", flex: 1, gap }}>
          <div style={{ flex: 1, background: fg, borderRadius: gap }} />
          <div style={{ flex: 1, background: fg, borderRadius: gap }} />
        </div>
        <div style={{ display: "flex", flex: 1, gap }}>
          <div style={{ flex: 1, background: fg, borderRadius: gap }} />
          <div style={{ flex: 1, background: fg, borderRadius: gap }} />
        </div>
      </div>
    </div>
  );
}
