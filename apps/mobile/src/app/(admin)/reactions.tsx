import type { WidgetRow } from "@portfolio/shared";
import { deleteReactionEmoji, getReactionCounts, getWidgets, reactionsSchema } from "@portfolio/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Eyebrow, Muted, success, tap } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { radius, space, useTheme } from "../../lib/theme";

// One reactions widget with its live per-emoji tally, split into the emojis the
// widget offers (config) and the ones visitors added (custom). Config emojis are
// managed in the widget editor; custom ones can be removed here.
type EmojiItem = { emoji: string; count: number; custom: boolean };
type ReactionWidget = { id: string; title: string; items: EmojiItem[] };

export default function ReactionsModeration() {
  const t = useTheme();
  const router = useRouter();
  const [widgets, setWidgets] = useState<ReactionWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildOne = useCallback(async (w: WidgetRow): Promise<ReactionWidget | null> => {
    const parsed = reactionsSchema.safeParse(w.config);
    if (!parsed.success) return null;
    let counts: Record<string, number> = {};
    try {
      counts = await getReactionCounts(supabase, w.id);
    } catch {
      counts = {};
    }
    const config = parsed.data.emojis;
    const items: EmojiItem[] = config.map((emoji) => ({ emoji, count: counts[emoji] ?? 0, custom: false }));
    for (const [emoji, count] of Object.entries(counts)) {
      if (!config.includes(emoji)) items.push({ emoji, count, custom: true });
    }
    return { id: w.id, title: parsed.data.title, items };
  }, []);

  const load = useCallback(
    async (refresh?: boolean) => {
      if (refresh) setRefreshing(true);
      try {
        const all = await getWidgets(supabase, { includeHidden: true });
        const reactions = all.filter((w) => w.type === "reactions");
        const built = (await Promise.all(reactions.map(buildOne))).filter(
          (r): r is ReactionWidget => r !== null,
        );
        setWidgets(built);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chargement impossible");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildOne],
  );

  useEffect(() => {
    load();
    const channel = supabase
      .channel("reactions-moderation")
      .on("postgres_changes", { event: "*", schema: "public", table: "widget_reactions" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const remove = (widgetId: string, item: EmojiItem) => {
    const verb = item.custom ? "Supprimer" : "Réinitialiser";
    const detail = item.custom
      ? `${item.emoji} disparaîtra du dashboard pour tout le monde.`
      : `Le compteur de ${item.emoji} repartira de zéro. L'emoji reste proposé (géré dans l'éditeur du widget).`;
    Alert.alert(`${verb} ${item.emoji} ?`, detail, [
      { text: "Annuler", style: "cancel" },
      {
        text: verb,
        style: "destructive",
        onPress: async () => {
          tap();
          setWidgets((prev) =>
            prev.map((w) =>
              w.id === widgetId ? { ...w, items: w.items.filter((i) => i.emoji !== item.emoji) } : w,
            ),
          );
          try {
            await deleteReactionEmoji(supabase, widgetId, item.emoji);
            success();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Suppression impossible");
            load();
          }
        },
      },
    ]);
  };

  const totalEmojis = widgets.reduce((n, w) => n + w.items.length, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ padding: space.lg, paddingBottom: space.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={{ color: t.textMuted, fontWeight: "700" }}>‹ Retour</Text>
        </Pressable>
        <View style={{ marginTop: 8 }}>
          <Eyebrow>Modération</Eyebrow>
          <Text style={{ color: t.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }}>Réactions</Text>
          <Muted style={{ marginTop: 4 }}>
            {widgets.length} tuile{widgets.length > 1 ? "s" : ""} · {totalEmojis} emoji{totalEmojis > 1 ? "s" : ""}.
            Balaie pour rafraîchir.
          </Muted>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={t.brand} size="large" style={{ marginTop: space.xl }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: space.lg, paddingTop: 0, gap: space.md, paddingBottom: space.xl * 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={t.brand} />}
        >
          {error ? <Banner text={error} /> : null}
          {widgets.length === 0 ? (
            <Muted>Aucune tuile de réactions sur ce dashboard.</Muted>
          ) : (
            widgets.map((w) => (
              <View
                key={w.id}
                style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: space.md, gap: space.sm }}
              >
                <Text style={{ color: t.text, fontWeight: "800", fontSize: 15 }}>{w.title}</Text>
                {w.items.length === 0 ? (
                  <Muted>Aucun emoji pour l'instant.</Muted>
                ) : (
                  w.items.map((item) => (
                    <View
                      key={item.emoji}
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                        <Text style={{ color: t.text, fontWeight: "800", fontSize: 15, fontVariant: ["tabular-nums"] }}>
                          {item.count}
                        </Text>
                        {item.custom ? (
                          <View style={{ backgroundColor: t.border, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                            <Text style={{ color: t.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 0.3 }}>
                              AJOUTÉ PAR UN VISITEUR
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Pressable onPress={() => remove(w.id, item)} hitSlop={8}>
                        <Text style={{ color: t.danger, fontWeight: "700", fontSize: 13 }}>
                          {item.custom ? "Supprimer" : "Réinitialiser"}
                        </Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
