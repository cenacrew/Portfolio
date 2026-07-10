import type { Breakpoint, Mood, WidgetBreakpointLayout, WidgetRow } from "@portfolio/shared";
import { DEFAULT_MOODS } from "@portfolio/shared";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Dimensions, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DragGrid } from "../../components/DragGrid";
import { Banner, Button, Card, Chip, Eyebrow, Muted, SectionTitle, TextField, Title, success, tap } from "../../components/ui";
import { persistLayouts, saveConfig } from "../../lib/actions";
import { useAuth } from "../../lib/auth";
import { syncMaLocationOnce } from "../../lib/maLoc";
import { radius, space, useTheme } from "../../lib/theme";
import { useWidgets } from "../../lib/widgets";

const GAP = 10;

export default function Dashboard() {
  const t = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();
  const { widgets, loading, refreshing, error, refresh } = useWidgets();

  const [bp, setBp] = useState<Breakpoint>("mobile");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const getCellsRef = useRef<(() => Record<string, { x: number; y: number; w: number; h: number }>) | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newEmoji, setNewEmoji] = useState("");
  const [newText, setNewText] = useState("");

  const width = Dimensions.get("window").width;
  const boardWidth = width - space.lg * 2;

  const statusWidget = widgets.find((w) => w.type === "status");
  const statusCfg = (statusWidget?.config && typeof statusWidget.config === "object" ? statusWidget.config : {}) as Record<string, unknown>;
  const extraMoods = (Array.isArray(statusCfg.extraMoods) ? statusCfg.extraMoods : []) as Mood[];
  const moods = useMemo(() => [...DEFAULT_MOODS, ...extraMoods], [extraMoods]);

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
    try {
      await saveConfig(statusWidget.id, { ...statusCfg, emoji, text });
      success();
      refresh();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Impossible de mettre à jour");
    }
  };

  const addMood = async () => {
    if (!statusWidget) {
      Alert.alert("Aucun widget statut", "Ajoute d'abord un widget « Statut / humeur » pour créer des humeurs.");
      return;
    }
    const emoji = newEmoji.trim();
    if (!emoji) {
      Alert.alert("Emoji manquant", "Choisis un emoji au clavier avant d'ajouter l'humeur.");
      return;
    }
    const mood: Mood = { emoji, text: newText.trim() || emoji };
    try {
      await saveConfig(statusWidget.id, { ...statusCfg, extraMoods: [...extraMoods, mood] });
      success();
      setNewEmoji("");
      setNewText("");
      setAddOpen(false);
      refresh();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Impossible d'ajouter l'humeur");
    }
  };

  const saveLayout = async () => {
    const getCells = getCellsRef.current;
    if (!getCells) return;
    const cells = getCells();
    const changes: { id: string; layout: WidgetBreakpointLayout }[] = [];
    for (const w of widgets) {
      const c = cells[w.id];
      if (!c) continue;
      const cur = w.layout[bp];
      if (cur.x !== c.x || cur.y !== c.y || cur.w !== c.w || cur.h !== c.h) {
        changes.push({ id: w.id, layout: { ...w.layout, [bp]: c } });
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

        {/* Quick status */}
        <View style={{ gap: space.md }}>
          <SectionTitle>Statut du moment</SectionTitle>

          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 18 }}>{(statusCfg.emoji as string) ?? "💬"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: "800" }}>Humeur</Text>
                <Muted>{statusWidget ? ((statusCfg.text as string) ?? "—") : "Aucun widget statut"}</Muted>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
              {moods.map((m, i) => (
                <Pressable
                  key={`${m.emoji}-${m.text}-${i}`}
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
              {/* "+" — add a custom mood (emoji keyboard) to the list. */}
              <Pressable
                onPress={() => {
                  tap();
                  setAddOpen((v) => !v);
                }}
                style={{ width: 40, height: 40, borderRadius: radius.pill, borderWidth: 1.5, borderColor: t.accent, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: t.accent, fontSize: 22, fontWeight: "700", marginTop: -2 }}>+</Text>
              </Pressable>
            </ScrollView>

            {addOpen ? (
              <View style={{ marginTop: 12, gap: space.sm }}>
                <View style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-end" }}>
                  <View style={{ width: 70 }}>
                    <Text style={{ color: t.text, fontWeight: "700", fontSize: 14, marginBottom: 6 }}>Emoji</Text>
                    <TextInput
                      value={newEmoji}
                      onChangeText={(v) => setNewEmoji(v.slice(0, 4))}
                      autoFocus
                      placeholder="🌙"
                      placeholderTextColor={t.textFaint}
                      style={{ backgroundColor: t.surfaceAlt, borderRadius: radius.sm, borderWidth: 1, borderColor: t.border, paddingHorizontal: 14, paddingVertical: 12, color: t.text, fontSize: 22, textAlign: "center" }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextField label="Texte (optionnel)" value={newText} onChange={setNewText} placeholder="Ex : Day off" />
                  </View>
                </View>
                <Button label="Ajouter à mes humeurs" onPress={addMood} variant="accent" />
              </View>
            ) : null}
          </Card>

          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button label="🪧 En-tête" onPress={() => router.push("/(admin)/header")} variant="ghost" style={{ flex: 1 }} />
            <Button label="💌 Livre d'or" onPress={() => router.push("/(admin)/guestbook")} variant="ghost" style={{ flex: 1 }} />
          </View>
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

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Muted style={{ flex: 1 }}>
              Appui long pour déplacer une tuile, tape pour la gérer.
              {bp === "desktop" ? " Vue desktop 5 colonnes (dézoomée)." : ""}
            </Muted>
            <Pressable onPress={() => { tap(); router.push("/(admin)/preview"); }} hitSlop={8}>
              <Text style={{ color: t.accent, fontWeight: "800", fontSize: 13 }}>👁 Rendu réel</Text>
            </Pressable>
          </View>

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

          {dirty ? (
            <Button label="Sauvegarder la disposition" onPress={saveLayout} loading={saving} />
          ) : null}
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
