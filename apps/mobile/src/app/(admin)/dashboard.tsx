import type { Breakpoint, WidgetBreakpointLayout } from "@portfolio/shared";
import { GRID, resolveCollisions } from "@portfolio/shared";
import { useFocusEffect, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DragGrid } from "../../components/DragGrid";
import { Banner, Button, Card, Chip, Eyebrow, Muted, SectionTitle, Title, success, tap } from "../../components/ui";
import { persistLayouts } from "../../lib/actions";
import { useAuth } from "../../lib/auth";
import { syncMaLocationOnce } from "../../lib/maLoc";
import { syncPresenceOnce } from "../../lib/presence";
import { radius, space, useTheme } from "../../lib/theme";
import { useWidgets } from "../../lib/widgets";

const GAP = 10;

export default function Dashboard() {
  const t = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();
  const { widgets, loading, refreshing, error, refresh, reload } = useWidgets();

  const [bp, setBp] = useState<Breakpoint>("mobile");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const getCellsRef = useRef<(() => Record<string, { x: number; y: number; w: number; h: number }>) | null>(null);

  // Reactive window size (phase 4.10 B1): reading Dimensions once left the
  // desktop board laid out at the portrait width after the forced landscape
  // rotation, squishing/mis-placing tiles. useWindowDimensions re-measures when
  // the orientation flips so the grid recomputes at the real width.
  const { width } = useWindowDimensions();
  const boardWidth = width - space.lg * 2;

  // Re-fetch when the dashboard regains focus so widgets added or resized on
  // another screen appear immediately (phase 4.10 B2).
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // Once per launch: refresh "ma-loc" maps and report this device's presence
  // (timezone + location) so the public dashboard follows the admin (C1).
  useEffect(() => {
    Promise.allSettled([syncMaLocationOnce(), syncPresenceOnce()]).then(() => refresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Desktop editing in landscape (phase 4.8 C5): with 9 columns the desktop
  // board needs the wide side. Force landscape while the desktop toggle is on,
  // back to portrait on mobile or when leaving the screen.
  useEffect(() => {
    const lock = async () => {
      try {
        await ScreenOrientation.lockAsync(
          bp === "desktop"
            ? ScreenOrientation.OrientationLock.LANDSCAPE
            : ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
      } catch {
        // Expo Go / unsupported: ignore, the board still works portrait.
      }
    };
    lock();
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [bp]);

  const saveLayout = async () => {
    const getCells = getCellsRef.current;
    if (!getCells) return;
    // Cells for the edited breakpoint come straight from the drag grid, already
    // de-overlapped by resolveCollisions. Phase 4.11 B1: the previous save only
    // wrote the ACTIVE breakpoint, so the other breakpoint kept whatever was in
    // the DB — including the slight overlaps that survived the 9-col remap, which
    // then reappeared on toggle/refresh. Re-resolve the OTHER breakpoint from its
    // stored layout here too, so every save persists clean, non-overlapping
    // layouts for BOTH breakpoints.
    const cells = getCells();
    const other: Breakpoint = bp === "mobile" ? "desktop" : "mobile";
    const otherCols = GRID[other].columns;
    const otherRects = widgets.map((w) => {
      const l = w.layout?.[other] ?? { x: 0, y: 0, w: 1, h: 1 };
      return { id: w.id, x: l.x, y: l.y, w: l.w, h: l.h };
    });
    const otherResolved = new Map(
      resolveCollisions(otherRects, otherCols).map((r) => [r.id, r]),
    );

    const changes: { id: string; layout: WidgetBreakpointLayout }[] = [];
    for (const w of widgets) {
      const active = cells[w.id] ?? w.layout[bp];
      const o = otherResolved.get(w.id);
      const nextOther = o ? { x: o.x, y: o.y, w: o.w, h: o.h } : w.layout[other];
      const nextLayout = { ...w.layout, [bp]: active, [other]: nextOther };
      const curActive = w.layout[bp];
      const curOther = w.layout[other];
      const activeChanged =
        curActive.x !== active.x || curActive.y !== active.y || curActive.w !== active.w || curActive.h !== active.h;
      const otherChanged =
        curOther.x !== nextOther.x || curOther.y !== nextOther.y || curOther.w !== nextOther.w || curOther.h !== nextOther.h;
      if (activeChanged || otherChanged) {
        changes.push({ id: w.id, layout: nextLayout });
      }
    }
    if (changes.length === 0) {
      setDirty(false);
      return;
    }
    setSaving(true);
    try {
      await persistLayouts(changes);
      success();
      setDirty(false);
      refresh();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Sauvegarde impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl * 3, gap: space.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.brand} />}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Eyebrow>Dashboard bento</Eyebrow>
            <Title>QRCodeAdmin</Title>
            <Muted style={{ marginTop: 4 }}>
              {widgets.length} widget{widgets.length > 1 ? "s" : ""} · {widgets.filter((w) => w.visible).length} visible
              {widgets.filter((w) => w.visible).length > 1 ? "s" : ""}
            </Muted>
          </View>
          <Pressable
            onPress={() => {
              tap();
              signOut();
            }}
            style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}
          >
            <Text style={{ color: t.textMuted, fontWeight: "700", fontSize: 12 }}>Déconnexion</Text>
          </Pressable>
        </View>

        {error ? <Banner text={error} /> : null}

        {/* Shortcuts to the header (status + infos) and guestbook */}
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Button label="🪧 En-tête & statut" onPress={() => router.push("/(admin)/header")} variant="ghost" style={{ flex: 1 }} />
          <Button label="💌 Livre d'or" onPress={() => router.push("/(admin)/guestbook")} variant="ghost" style={{ flex: 1 }} />
        </View>

        {/* Live board — drag to arrange, tap to manage */}
        <View style={{ gap: space.md }}>
          <SectionTitle
            right={
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <Chip label="📱 Mobile" active={bp === "mobile"} onPress={() => setBp("mobile")} />
                <Chip label="🖥️ Desktop" active={bp === "desktop"} onPress={() => setBp("desktop")} />
              </View>
            }
          >
            Disposition
          </SectionTitle>

          <Muted>
            Appui long pour déplacer une tuile, tape pour la gérer.
            {bp === "desktop" ? " Vue desktop 9 colonnes (paysage)." : ""}
          </Muted>

          {loading ? (
            <Muted>Chargement…</Muted>
          ) : widgets.length === 0 ? (
            <Card>
              <Muted>Aucun widget. Touche le bouton « + » pour commencer.</Muted>
            </Card>
          ) : (
            <DragGrid
              widgets={widgets}
              breakpoint={bp}
              boardWidth={boardWidth}
              gap={GAP}
              onTapTile={(id) => router.push(`/(admin)/widget/${id}?bp=${bp}`)}
              onDirtyChange={setDirty}
              registerGetCells={(getter) => {
                getCellsRef.current = getter;
              }}
            />
          )}
        </View>
      </ScrollView>

      {/* FAB — "Rendu réel" (bottom-left, phase 4.8 C2) */}
      <Pressable
        onPress={() => {
          tap();
          router.push("/(admin)/preview");
        }}
        accessibilityLabel="Voir le rendu réel"
        style={({ pressed }) => [fabStyle(t, "left"), pressed && { transform: [{ scale: 0.94 }], opacity: 0.9 }]}
      >
        <Text style={{ fontSize: 24, marginTop: -1 }}>👁</Text>
      </Pressable>

      {/* FAB — add a widget (bottom-right) */}
      <Pressable
        onPress={() => {
          tap();
          router.push("/(admin)/new");
        }}
        accessibilityLabel="Ajouter un widget"
        style={({ pressed }) => [fabStyle(t, "right"), pressed && { transform: [{ scale: 0.94 }], opacity: 0.9 }]}
      >
        <Text style={{ color: t.onBrand, fontSize: 32, lineHeight: 34, fontWeight: "700", marginTop: -2 }}>+</Text>
      </Pressable>

      {/* Floating save action (phase 6) — sits between the two FABs, shown only
          when the layout has pending changes, so it's reachable without scrolling
          past a tall board. Amber = the app's "attention / pending" accent. */}
      {dirty ? (
        <View style={savePillContainer} pointerEvents="box-none">
          <Pressable
            onPress={saveLayout}
            disabled={saving}
            accessibilityLabel="Enregistrer la disposition"
            style={({ pressed }) => [savePillStyle(t), pressed && { transform: [{ scale: 0.96 }], opacity: 0.92 }]}
          >
            {saving ? (
              <ActivityIndicator color={t.onAccent} />
            ) : (
              <Text style={{ color: t.onAccent, fontWeight: "800", fontSize: 15 }}>✓ Enregistrer</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// Container spans the gap between the two 60px FABs (inset so the pill never
// overlaps them) and centers the pill, aligned to the FABs' vertical centre.
const savePillContainer = {
  position: "absolute" as const,
  left: space.lg + 60 + space.sm,
  right: space.lg + 60 + space.sm,
  bottom: space.lg + 12,
  alignItems: "center" as const,
};

function savePillStyle(t: ReturnType<typeof useTheme>) {
  return {
    height: 52,
    minWidth: 132,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    backgroundColor: t.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  };
}

function fabStyle(t: ReturnType<typeof useTheme>, side: "left" | "right") {
  return {
    position: "absolute" as const,
    [side]: space.lg,
    bottom: space.lg + 8,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: side === "right" ? t.brand : t.surface,
    borderWidth: side === "left" ? 1 : 0,
    borderColor: t.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  };
}
