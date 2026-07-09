import type { WidgetRow } from "@portfolio/shared";
import { getWidgets } from "@portfolio/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import DraggableFlatList, { ScaleDecorator, type RenderItemParams } from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Eyebrow, Muted, success, tap } from "../../components/ui";
import { persistOrder } from "../../lib/actions";
import { meta } from "../../lib/registry";
import { supabase } from "../../lib/supabase";
import { radius, space, useTheme } from "../../lib/theme";

// Phase 4.5: this screen is ONLY about order. Drag a row to reorder; size,
// visibility and config now live in the per-tile screen (tap a tile). Drag uses
// react-native-draggable-flatlist (Reanimated + gesture-handler, Expo Go OK).
export default function Reorder() {
  const t = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<WidgetRow[]>([]);
  const [loading, setLoading] = useState(true);
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

  const onDragEnd = async (data: WidgetRow[]) => {
    const reindexed = data.map((w, i) => ({ ...w, position: i }));
    setRows(reindexed);
    try {
      await persistOrder(reindexed.map((w) => ({ id: w.id, position: w.position })));
      success();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Réorganisation impossible");
    }
  };

  const renderItem = ({ item, drag, isActive, getIndex }: RenderItemParams<WidgetRow>) => {
    const def = meta(item.type);
    const index = getIndex();
    return (
      <ScaleDecorator>
        <Pressable
          onLongPress={drag}
          delayLongPress={120}
          disabled={isActive}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: isActive ? t.bgElevated : t.surface,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: isActive ? t.accent : t.border,
            padding: space.md,
            marginBottom: space.sm,
            opacity: item.visible ? 1 : 0.55,
          }}
        >
          <Text style={{ fontSize: 22, color: t.textFaint }}>⠿</Text>
          <Text style={{ fontSize: 22 }}>{def.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: "800" }}>{def.label}</Text>
            <Muted>
              Position {typeof index === "number" ? index + 1 : "—"}
              {item.visible ? "" : " · masqué"}
            </Muted>
          </View>
          <Pressable
            hitSlop={10}
            onPress={() => {
              tap();
              router.push(`/(admin)/widget/${item.id}`);
            }}
          >
            <Text style={{ color: t.accent, fontWeight: "800", fontSize: 13 }}>Gérer</Text>
          </Pressable>
        </Pressable>
      </ScaleDecorator>
    );
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
          <Muted style={{ marginTop: 4 }}>Maintiens une tuile puis glisse-la pour changer l'ordre. Taille, visibilité et contenu se gèrent en touchant la tuile.</Muted>
        </View>
        {error ? <View style={{ marginTop: space.sm }}><Banner text={error} /></View> : null}
      </View>

      {loading ? (
        <ActivityIndicator color={t.brand} size="large" style={{ marginTop: space.xl }} />
      ) : (
        <DraggableFlatList
          data={rows}
          keyExtractor={(item) => item.id}
          onDragEnd={({ data }) => onDragEnd(data)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: space.xl * 2 }}
        />
      )}
    </SafeAreaView>
  );
}
