import { ImageResponse } from "next/og";

// Static-at-build OG card for /qrcode. Bento layout in the site palette
// (cream #EBE3E0 on navy #0d0c62) so shared links render a clean preview.
export const runtime = "nodejs";
export const alt = "Le dashboard bento de Valentin Sourdois Pajot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0d0c62";
const CREAM = "#EBE3E0";

function Tile({
  children,
  bg = CREAM,
  color = NAVY,
  grow = 1,
  extra = {},
}: {
  children?: React.ReactNode;
  bg?: string;
  color?: string;
  grow?: number;
  extra?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexGrow: grow,
        background: bg,
        color,
        borderRadius: 28,
        padding: "26px 30px",
        alignItems: "flex-end",
        fontSize: 34,
        fontWeight: 700,
        ...extra,
      }}
    >
      {children}
    </div>
  );
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: NAVY,
          padding: 56,
          fontFamily: "sans-serif",
        }}
      >
        {/* Left: identity */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 620,
            paddingRight: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 34,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 92,
                height: 92,
                borderRadius: "50%",
                background: CREAM,
                color: NAVY,
                fontSize: 46,
                fontWeight: 800,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              VS
            </div>
            <div
              style={{
                display: "flex",
                background: "rgba(235,227,224,0.14)",
                color: CREAM,
                padding: "10px 20px",
                borderRadius: 999,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              cenacrew.com/qrcode
            </div>
          </div>
          <div
            style={{
              display: "flex",
              color: CREAM,
              fontSize: 74,
              fontWeight: 800,
              lineHeight: 1.05,
            }}
          >
            Valentin Sourdois Pajot
          </div>
          <div
            style={{
              display: "flex",
              color: "rgba(235,227,224,0.82)",
              fontSize: 34,
              fontWeight: 500,
              marginTop: 20,
            }}
          >
            Développeur Full-Stack · mon coin du web en un scan
          </div>
        </div>

        {/* Right: mini bento grid */}
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: 18 }}>
          <div style={{ display: "flex", gap: 18, flexGrow: 1 }}>
            <Tile grow={2}>projets</Tile>
            <Tile bg="#2a2977" color={CREAM}>musique</Tile>
          </div>
          <div style={{ display: "flex", gap: 18, flexGrow: 1 }}>
            <Tile bg="#2a2977" color={CREAM}>carte</Tile>
            <Tile grow={2}>livre d’or</Tile>
          </div>
          <div style={{ display: "flex", gap: 18, flexGrow: 1 }}>
            <Tile>météo</Tile>
            <Tile bg={CREAM}>liens</Tile>
            <Tile bg="#2a2977" color={CREAM}>+</Tile>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
