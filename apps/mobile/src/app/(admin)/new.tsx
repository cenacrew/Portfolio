import type { WidgetRow } from "@portfolio/shared";
import { getWidgets } from "@portfolio/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Eyebrow, Muted, success, tap } from "../../components/ui";
import { addWidget } from "../../lib/actions";
import { useDashboards } from "../../lib/dashboards";
import { ALL_TYPES, meta } from "../../lib/registry";

// The status/mood tile left the grid for the header (phase 4.8 B2), so it no
// longer appears in the add gallery. Its type stays registered for compat.
const GALLERY_TYPES = ALL_TYPES.filter((type) => type !== "status");
import { supabase } from "../../lib/supabase";
import { radius, space, useTheme } from "../../lib/theme";

export default function NewWidget() {
  const t = useTheme();
  const router = useRouter();
  const { selected } = useDashboards();
  const [widgets, setWidgets] = useState<WidgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getWidgets(supabase, { includeHidden: true, dashboardId: selected.id || null })
      .then((r) => alive && setWidgets(r))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [selected.id]);

  const create = async (type: (typeof ALL_TYPES)[number]) => {
    tap();
    setCreating(type);
    setError(null);
    try {
      const created = await addWidget(type, widgets, selected.id || null);
      success();
      router.replace(`/(admin)/widget/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible");
      setCreating(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ padding: space.lg, paddingBottom: space.sm }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: t.textMuted, fontWeight: "700" }}>‹ Retour</Text>
        </Pressable>
        <View style={{ marginTop: 8 }}>
          <Eyebrow>Galerie</Eyebrow>
          <Text style={{ color: t.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }}>Ajouter un widget</Text>
          <Muted style={{ marginTop: 4 }}>Créé avec ses valeurs par défaut, puis ouvert pour l'éditer.</Muted>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={t.brand} size="large" style={{ marginTop: space.xl }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, gap: space.sm, paddingBottom: space.xl * 2 }}>
          {error ? <Banner text={error} /> : null}
          {GALLERY_TYPES.map((type) => {
            const def = meta(type);
            const busy = creating === type;
            return (
              <Pressable
                key={type}
                disabled={!!creating}
                onPress={() => create(type)}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    backgroundColor: t.surface,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: t.border,
                    padding: space.md,
                    opacity: creating && !busy ? 0.5 : 1,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={{ fontSize: 26 }}>{def.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: "800", fontSize: 15 }}>{def.label}</Text>
                  <Muted>{def.description}</Muted>
                </View>
                {busy ? <ActivityIndicator color={t.brand} /> : <Text style={{ color: t.accent, fontWeight: "800", fontSize: 20 }}>+</Text>}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
