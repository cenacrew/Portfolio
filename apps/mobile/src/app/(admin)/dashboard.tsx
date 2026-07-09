import type { WidgetRow } from "@portfolio/shared";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Dimensions, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WidgetTile } from "../../components/WidgetPreview";
import { Banner, Button, Card, Eyebrow, Muted, SectionTitle, Title, success, tap } from "../../components/ui";
import { postPhoto, saveConfig, uploadImage } from "../../lib/actions";
import { useAuth } from "../../lib/auth";
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
  const [busyPhoto, setBusyPhoto] = useState(false);

  const width = Dimensions.get("window").width;
  const unit = Math.floor((width - space.lg * 2 - GAP * 2) / 3);

  const statusWidget = widgets.find((w) => w.type === "status");

  const setMood = async (m: { emoji: string; text: string }) => {
    if (!statusWidget) {
      Alert.alert("Aucun widget statut", "Ajoute d'abord un widget « Statut / humeur ».");
      return;
    }
    const cfg = (statusWidget.config && typeof statusWidget.config === "object" ? statusWidget.config : {}) as Record<string, unknown>;
    try {
      await saveConfig(statusWidget.id, { ...cfg, emoji: m.emoji, text: m.text });
      success();
      refresh();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Impossible de mettre à jour");
    }
  };

  const pickAndPost = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Accès refusé", "Autorise l'accès aux photos pour en publier une.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    });
    if (res.canceled || !res.assets[0]?.base64) return;
    setBusyPhoto(true);
    try {
      const asset = res.assets[0];
      const mime = asset.mimeType ?? "image/jpeg";
      const url = await uploadImage(asset.base64!, mime);
      await postPhoto(url, widgets);
      success();
      refresh();
      Alert.alert("Photo publiée", "Elle apparaît maintenant sur ton dashboard.");
    } catch (e) {
      Alert.alert("Échec de l'envoi", e instanceof Error ? e.message : "Réessaie.");
    } finally {
      setBusyPhoto(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl * 2, gap: space.lg }}
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
                    setMood(m);
                  }}
                  style={{ borderWidth: 1.5, borderColor: t.border, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 12, flexDirection: "row", gap: 6, alignItems: "center" }}
                >
                  <Text style={{ fontSize: 15 }}>{m.emoji}</Text>
                  <Text style={{ color: t.textMuted, fontWeight: "700", fontSize: 12 }}>{m.text}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Card>

          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button label={busyPhoto ? "Envoi…" : "📷 Poster une photo"} onPress={pickAndPost} variant="accent" loading={busyPhoto} style={{ flex: 1 }} />
            <Button label="💌 Livre d'or" onPress={() => router.push("/(admin)/guestbook")} variant="ghost" style={{ flex: 1 }} />
          </View>
        </View>

        {/* Bento preview */}
        <View style={{ gap: space.md }}>
          <SectionTitle
            right={
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => { tap(); router.push("/(admin)/reorder"); }}>
                  <Text style={{ color: t.accent, fontWeight: "800", fontSize: 13 }}>Réorganiser</Text>
                </Pressable>
                <Pressable onPress={() => { tap(); router.push("/(admin)/new"); }}>
                  <Text style={{ color: t.accent, fontWeight: "800", fontSize: 13 }}>+ Ajouter</Text>
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
              <Muted>Aucun widget. Touche « + Ajouter » pour commencer.</Muted>
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
    </SafeAreaView>
  );
}
