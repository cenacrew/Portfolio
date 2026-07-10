import type { WidgetRow } from "@portfolio/shared";
import { Image } from "expo-image";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { meta } from "../lib/registry";
import { NOTE_TONES, radius, useTheme, type Palette } from "../lib/theme";
import { tap } from "./ui";

// Simplified but tidy per-type preview of a widget, sized to its MOBILE layout
// on a 3-column bento (unit = one grid cell). Not pixel-identical to the web —
// just a faithful, pretty glance so the admin recognises each tile.

function asObj(config: unknown): Record<string, any> {
  return (config && typeof config === "object" ? config : {}) as Record<string, any>;
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return null;
  return Math.max(0, Math.ceil((d - Date.now()) / 86400000));
}

export function PreviewBody({ row, t }: { row: WidgetRow; t: Palette }) {
  const c = asObj(row.config);
  const title = (v: string) => (
    <Text numberOfLines={2} style={{ color: t.text, fontWeight: "800", fontSize: 15, letterSpacing: -0.2 }}>
      {v}
    </Text>
  );
  const sub = (v: string) => (
    <Text numberOfLines={2} style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>
      {v}
    </Text>
  );

  switch (row.type) {
    case "note": {
      const tone = NOTE_TONES[c.tone] ?? NOTE_TONES.cream;
      return (
        <View style={{ flex: 1, backgroundColor: tone.bg, borderRadius: radius.sm, padding: 10, justifyContent: "space-between" }}>
          <Text numberOfLines={5} style={{ color: tone.fg, fontSize: 13, fontWeight: "600" }}>
            {c.text || "…"}
          </Text>
          {c.signature ? <Text style={{ color: tone.fg, fontSize: 11, opacity: 0.7 }}>— {c.signature}</Text> : null}
        </View>
      );
    }
    case "status":
      return (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: 26 }}>{c.emoji || "💬"}</Text>
          {title(c.text || "Statut")}
          {c.updated ? sub(c.updated) : null}
        </View>
      );
    case "photo": {
      const src = c.images?.[0]?.src as string | undefined;
      if (src && /^https?:/.test(src)) {
        return <Image source={{ uri: src }} style={{ flex: 1, borderRadius: radius.sm }} contentFit="cover" transition={150} />;
      }
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 30 }}>🖼️</Text>
          {sub(src ? "Image locale" : "Aucune image")}
        </View>
      );
    }
    case "video": {
      const poster = c.poster as string | undefined;
      return (
        <View style={{ flex: 1, borderRadius: radius.sm, overflow: "hidden", backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
          {poster && /^https?:/.test(poster) ? (
            <Image source={{ uri: poster }} style={{ position: "absolute", width: "100%", height: "100%" }} contentFit="cover" transition={150} />
          ) : null}
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18, color: "#000", marginLeft: 3 }}>▶</Text>
          </View>
          {!c.src ? <Text style={{ position: "absolute", bottom: 8, color: "#fff", fontSize: 11 }}>Aucune vidéo</Text> : null}
        </View>
      );
    }
    case "social-link":
      return (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: 24 }}>{meta(row.type).emoji}</Text>
          {title(c.handle || c.platform || "Lien")}
          {sub(c.label || c.url || "")}
        </View>
      );
    case "poll":
      return (
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20 }}>📊</Text>
          {title(c.question || "Sondage")}
          {sub(`${c.options?.length ?? 0} options`)}
        </View>
      );
    case "watchlist":
      return (
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20 }}>🎬</Text>
          {title(c.title || "Watchlist")}
          {sub(`${c.items?.length ?? 0} titres`)}
        </View>
      );
    case "countdown": {
      const d = daysUntil(c.target);
      return (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: 22 }}>{c.emoji || "⏳"}</Text>
          {title(c.title || "Compte à rebours")}
          {sub(d === null ? "" : d === 0 ? "Aujourd'hui !" : `${d} j restants`)}
        </View>
      );
    }
    case "visitor-counter":
      return (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ color: t.text, fontSize: 28, fontWeight: "800" }}>{c.count ?? 0}</Text>
          {sub(c.label || "visites")}
        </View>
      );
    case "guestbook":
      return (
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20 }}>💌</Text>
          {title(c.title || "Livre d'or")}
          {sub(c.prompt || "")}
        </View>
      );
    case "spotify-now-playing":
      return (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: 20 }}>🎵</Text>
          {title(c.track || "En écoute")}
          {sub(c.artist || "")}
        </View>
      );
    case "location-map":
    case "weather":
      return (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: 24 }}>{meta(row.type).emoji}</Text>
          {title(c.city || "Ville")}
        </View>
      );
    case "free-link":
      return (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: 22 }}>{c.emoji || "✨"}</Text>
          {title(c.title || "Lien")}
          {sub(c.url || "")}
        </View>
      );
    default: {
      const m = meta(row.type);
      return (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
          {title(m.label)}
        </View>
      );
    }
  }
}

export function WidgetTile({ row, unit, gap, onPress }: { row: WidgetRow; unit: number; gap: number; onPress?: () => void }) {
  const t = useTheme();
  const { w, h } = row.layout.mobile;
  const width = unit * w + gap * (w - 1);
  const height = unit * h + gap * (h - 1);
  const dim = !row.visible;

  const box: ViewStyle = {
    width,
    height,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
    padding: 12,
    overflow: "hidden",
    opacity: dim ? 0.5 : 1,
  };

  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          tap();
          onPress();
        }
      }}
      style={({ pressed }) => [box, pressed && onPress ? { opacity: dim ? 0.4 : 0.8 } : null]}
    >
      <PreviewBody row={row} t={t} />
      {dim ? (
        <View style={{ position: "absolute", top: 8, right: 8, backgroundColor: t.overlay, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>MASQUÉ</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
