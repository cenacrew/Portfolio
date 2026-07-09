import type { GuestbookRow } from "@portfolio/shared";
import { deleteGuestbookMessage, getGuestbookMessages } from "@portfolio/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Eyebrow, Muted, success, tap } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { radius, space, useTheme } from "../../lib/theme";

export default function Guestbook() {
  const t = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<GuestbookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh?: boolean) => {
    if (refresh) setRefreshing(true);
    try {
      const data = await getGuestbookMessages(supabase);
      setRows(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("guestbook-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "guestbook_messages" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const remove = (row: GuestbookRow) => {
    Alert.alert("Supprimer ce message ?", `"${row.message.slice(0, 60)}"`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          tap();
          setRows((prev) => prev.filter((r) => r.id !== row.id));
          try {
            await deleteGuestbookMessage(supabase, row.id);
            success();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Suppression impossible");
            load();
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ padding: space.lg, paddingBottom: space.sm }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: t.textMuted, fontWeight: "700" }}>‹ Retour</Text>
        </Pressable>
        <View style={{ marginTop: 8 }}>
          <Eyebrow>Modération</Eyebrow>
          <Text style={{ color: t.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }}>Livre d'or</Text>
          <Muted style={{ marginTop: 4 }}>
            {rows.length} message{rows.length > 1 ? "s" : ""}. Balaie pour rafraîchir.
          </Muted>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={t.brand} size="large" style={{ marginTop: space.xl }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: space.lg, paddingTop: 0, gap: space.sm, paddingBottom: space.xl * 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={t.brand} />}
        >
          {error ? <Banner text={error} /> : null}
          {rows.length === 0 ? (
            <Muted>Aucun message pour l'instant.</Muted>
          ) : (
            rows.map((row) => (
              <View key={row.id} style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: space.md, gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: t.text, fontWeight: "800" }}>{row.author}</Text>
                  <Pressable onPress={() => remove(row)} hitSlop={10}>
                    <Text style={{ color: t.danger, fontWeight: "700", fontSize: 13 }}>Supprimer</Text>
                  </Pressable>
                </View>
                <Text style={{ color: t.textMuted, fontSize: 14, lineHeight: 20 }}>{row.message}</Text>
                <Text style={{ color: t.textFaint, fontSize: 11 }}>{new Date(row.created_at).toLocaleString("fr-FR")}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
