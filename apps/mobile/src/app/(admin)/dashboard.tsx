import type { WidgetRow } from "@portfolio/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Dimensions, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WidgetTile } from "../../components/WidgetPreview";
import { Banner, Button, Card, EmojiPickerRow, Eyebrow, Muted, SectionTitle, TextField, Title, success, tap } from "../../components/ui";
import { saveConfig } from "../../lib/actions";
import { useAuth } from "../../lib/auth";
import { syncMaLocationOnce } from "../../lib/maLoc";
import { radius, space, useTheme } from "../../lib/theme";
import { useWidgets } from "../../lib/widgets";

const GAP = 10;

const MOODS: { emoji: string; text: string }[] = [
  { emoji: "💻", text: "En train de coder" },
  { emoji: "☕", text: "Pause café" },
  { emoji: "🎧", text: "Focus, musique à fond" },
  { emoji: "🌙", text: "Off pour aujourd'hui" },
  { emoji: "🚀", text: "Sur un nouveau projet" },
  { emoji: "📚", text: "En train d'apprendre" },
];

export default function Dashboard() {
  const t = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();
  const { widgets, loading, refreshing, error, refresh } = useWidgets();

  const [customOpen, setCustomOpen] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("🌙");
  const [customText, setCustomText] = useState("");

  const width = Dimensions.get("window").width;
  const unit = Math.floor((width - space.lg * 2 - GAP * 2) / 3);

  const statusWidget = widgets.find((w) => w.type === "status");

  // "Ma loc": refresh location-map widgets from the device once per app launch.
  useEffect(() => {
    syncMaLocationOnce()
      .then(() => refresh())
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyStatus = async (emoji: string, text: string) => {
    if (!statusWidget) {
      Alert.alert("Aucun widget statut", "Ajoute d'abord un widget « Statut / humeur ».");
      return;
    }
    if (!text.trim()) {
      Alert.alert("Statut vide", "Écris un statut avant de l'appliquer.");
      return;
    }
    const cfg = (statusWidget.config && typeof statusWidget.config === "object" ? statusWidget.config : {}) as Record<string, unknown>;
    try {
      await saveConfig(statusWidget.id, { ...cfg, emoji, text });
      success();
      refresh();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Impossible de mettre à jour");
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

        {/* Quick actions */}
        <View style={{ gap: space.md }}>
          <SectionTitle>Raccourcis</SectionTitle>

          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 18 }}>{statusWidget ? (statusWidget.config as any)?.emoji ?? "💬" : "💬"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: "800" }}>Statut du moment</Text>
                <Muted>{statusWidget ? (statusWidget.config as any)?.text ?? "—" : "Aucun widget statut"}</Muted>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {MOODS.map((m) => (
                <Pressable
                  key={m.text}
                  onPress={() => {
                    tap();
                    applyStatus(m.emoji, m.text);
                  }}
                  style={{ borderWidth: 1.5, borderColor: t.border, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 12, flexDirection: "row", gap: 6, alignItems: "center" }}
                >
                  <Text style={{ fontSize: 15 }}>{m.emoji}</Text>
                  <Text style={{ color: t.textMuted, fontWeight: "700", fontSize: 12 }}>{m.text}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable onPress={() => { tap(); setCustomOpen((v) => !v); }} style={{ marginTop: 12 }}>
              <Text style={{ color: t.accent, fontWeight: "800", fontSize: 13 }}>{customOpen ? "− Statut personnalisé" : "+ Statut personnalisé"}</Text>
            </Pressable>
            {customOpen ? (
              <View style={{ marginTop: 10, gap: space.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 26 }}>{customEmoji}</Text>
                  <Text style={{ color: t.textMuted, flex: 1 }}>{customText || "Ton statut libre…"}</Text>
                </View>
                <EmojiPickerRow label="Emoji" value={customEmoji} onChange={setCustomEmoji} />
                <TextField label="Statut" value={customText} onChange={setCustomText} placeholder="Ex : Day off" />
                <Button label="Appliquer ce statut" onPress={() => applyStatus(customEmoji, customText)} variant="accent" />
              </View>
            ) : null}
          </Card>

          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button label="🪧 En-tête" onPress={() => router.push("/(admin)/header")} variant="ghost" style={{ flex: 1 }} />
            <Button label="💌 Livre d'or" onPress={() => router.push("/(admin)/guestbook")} variant="ghost" style={{ flex: 1 }} />
          </View>
        </View>

        {/* Bento preview */}
        <View style={{ gap: space.md }}>
          <SectionTitle
            right={
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Pressable onPress={() => { tap(); router.push("/(admin)/preview"); }} hitSlop={8}>
                  <Text style={{ color: t.accent, fontWeight: "800", fontSize: 13 }}>👁 Rendu réel</Text>
                </Pressable>
                <Pressable onPress={() => { tap(); router.push("/(admin)/reorder"); }} hitSlop={8}>
                  <Text style={{ color: t.accent, fontWeight: "800", fontSize: 13 }}>Réorganiser</Text>
                </Pressable>
              </View>
            }
          >
            Aperçu
          </SectionTitle>

          {loading ? (
            <Muted>Chargement…</Muted>
          ) : widgets.length === 0 ? (
            <Card>
              <Muted>Aucun widget. Touche le bouton « + » pour commencer.</Muted>
            </Card>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
              {widgets.map((w: WidgetRow) => (
                <WidgetTile key={w.id} row={w} unit={unit} gap={GAP} onPress={() => router.push(`/(admin)/widget/${w.id}`)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB — add a widget */}
      <Pressable
        onPress={() => {
          tap();
          router.push("/(admin)/new");
        }}
        accessibilityLabel="Ajouter un widget"
        style={({ pressed }) => [
          {
            position: "absolute",
            right: space.lg,
            bottom: space.lg + 8,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: t.brand,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          },
          pressed && { transform: [{ scale: 0.94 }], opacity: 0.9 },
        ]}
      >
        <Text style={{ color: t.onBrand, fontSize: 32, lineHeight: 34, fontWeight: "700", marginTop: -2 }}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}
