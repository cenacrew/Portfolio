import type { Breakpoint, WidgetRow, WidgetSize } from "@portfolio/shared";
import { getWidgets } from "@portfolio/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Chip, Eyebrow, Muted, ToggleRow, success, tap } from "../../components/ui";
import { persistOrder, setSize, setVisible } from "../../lib/actions";
import { meta } from "../../lib/registry";
import { supabase } from "../../lib/supabase";
import { radius, space, useTheme } from "../../lib/theme";

const sizeLabel = (s: WidgetSize) => `${s.w}×${s.h}`;
const eqSize = (a: WidgetSize, b: { w: number; h: number }) => a.w === b.w && a.h === b.h;

export default function Reorder() {
  const t = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<WidgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bp, setBp] = useState<Breakpoint>("mobile");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getWidgets(supabase, { includeHidden: true })
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const move = async (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= rows.length) return;
    tap();
    const next = [...rows];
    [next[index], next[j]] = [next[j], next[index]];
    const reindexed = next.map((w, i) => ({ ...w, position: i }));
    setRows(reindexed);
    try {
      await persistOrder(reindexed.map((w) => ({ id: w.id, position: w.position })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Réorganisation impossible");
    }
  };

  const changeSize = async (row: WidgetRow, size: WidgetSize) => {
    tap();
    try {
      const updated = await setSize(row, bp, size);
      setRows((prev) => prev.map((w) => (w.id === row.id ? updated : w)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Taille non enregistrée");
    }
  };

  const toggle = async (row: WidgetRow, visible: boolean) => {
    setRows((prev) => prev.map((w) => (w.id === row.id ? { ...w, visible } : w)));
    try {
      await setVisible(row.id, visible);
      success();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Visibilité non enregistrée");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ padding: space.lg, paddingBottom: space.sm }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: t.textMuted, fontWeight: "700" }}>‹ Retour</Text>
        </Pressable>
        <View style={{ marginTop: 8 }}>
          <Eyebrow>Organisation</Eyebrow>
          <Text style={{ color: t.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }}>Réorganiser</Text>
          <Muted style={{ marginTop: 4 }}>Ordre, taille par écran et visibilité. Chaque changement est enregistré aussitôt.</Muted>
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: space.md }}>
          <Chip label="📱 Mobile" active={bp === "mobile"} onPress={() => setBp("mobile")} />
          <Chip label="🖥️ Desktop" active={bp === "desktop"} onPress={() => setBp("desktop")} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={t.brand} size="large" style={{ marginTop: space.xl }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, gap: space.sm, paddingBottom: space.xl * 2 }}>
          {error ? <Banner text={error} /> : null}
          {rows.map((row, i) => {
            const def = meta(row.type);
            const cur = row.layout[bp];
            return (
              <View key={row.id} style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: space.md, gap: 10, opacity: row.visible ? 1 : 0.6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ gap: 2 }}>
                    <Pressable onPress={() => move(i, -1)} disabled={i === 0} style={{ opacity: i === 0 ? 0.3 : 1, padding: 4 }}>
                      <Text style={{ color: t.text, fontSize: 18, fontWeight: "800" }}>▲</Text>
                    </Pressable>
                    <Pressable onPress={() => move(i, 1)} disabled={i === rows.length - 1} style={{ opacity: i === rows.length - 1 ? 0.3 : 1, padding: 4 }}>
                      <Text style={{ color: t.text, fontSize: 18, fontWeight: "800" }}>▼</Text>
                    </Pressable>
                  </View>
                  <Text style={{ fontSize: 22 }}>{def.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.text, fontWeight: "800" }}>{def.label}</Text>
                    <Muted>Position {i + 1}</Muted>
                  </View>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {def.sizes.map((s) => (
                    <Chip key={sizeLabel(s)} label={sizeLabel(s)} active={eqSize(s, cur)} onPress={() => changeSize(row, s)} />
                  ))}
                </View>

                <ToggleRow label="Visible" value={row.visible} onChange={(v) => toggle(row, v)} />
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
