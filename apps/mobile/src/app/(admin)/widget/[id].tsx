import type { Breakpoint, WidgetRow, WidgetSize } from "@portfolio/shared";
import { sizesForBreakpoint } from "@portfolio/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TypeEditor } from "../../../components/editors";
import { Banner, Button, Chip, Eyebrow, Muted, SectionTitle, ToggleRow, success } from "../../../components/ui";
import { deleteW, duplicateW, resetToile, saveConfig, setSize, setVisible } from "../../../lib/actions";
import { meta } from "../../../lib/registry";
import { supabase } from "../../../lib/supabase";
import { radius, space, useTheme } from "../../../lib/theme";

const sizeLabel = (s: WidgetSize) => `${s.w}×${s.h}`;
const eqSize = (a: WidgetSize, b: { w: number; h: number }) => a.w === b.w && a.h === b.h;

export default function EditWidget() {
  const { id, bp: bpParam } = useLocalSearchParams<{ id: string; bp?: string }>();
  const t = useTheme();
  const router = useRouter();

  // The breakpoint is chosen on the main board (its mobile/desktop toggle) and
  // passed in — the size picker here applies to THAT breakpoint only (phase 4.6).
  const bp: Breakpoint = bpParam === "desktop" ? "desktop" : "mobile";

  const [row, setRow] = useState<WidgetRow | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [visible, setVis] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase
      .from("widgets")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error || !data) {
          setError("Widget introuvable");
          return;
        }
        const r = data as WidgetRow;
        setRow(r);
        setConfig(r.config);
        setVis(r.visible);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (!row || config === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
        {error ? <Banner text={error} /> : <ActivityIndicator color={t.brand} size="large" />}
      </SafeAreaView>
    );
  }

  const def = meta(row.type);

  const save = async () => {
    setError(null);
    const parsed = def.schema.safeParse(config);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => `${i.path.join(".") || "champ"} : ${i.message}`).join("\n"));
      return;
    }
    setSaving(true);
    try {
      if (visible !== row.visible) await setVisible(row.id, visible);
      await saveConfig(row.id, parsed.data);
      success();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const changeSize = async (size: WidgetSize) => {
    if (!row) return;
    setError(null);
    try {
      const updated = await setSize(row, bp, size);
      setRow(updated);
      success();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Taille non enregistrée");
    }
  };

  const duplicate = async () => {
    if (!row) return;
    setError(null);
    setSaving(true);
    try {
      await duplicateW(row.id);
      success();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Duplication impossible");
    } finally {
      setSaving(false);
    }
  };

  const confirmReset = () => {
    if (!row) return;
    Alert.alert("Réinitialiser la toile ?", "La toile actuelle est archivée, puis remise à blanc.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Réinitialiser",
        style: "destructive",
        onPress: async () => {
          try {
            await resetToile(row);
            success();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Réinitialisation impossible");
          }
        },
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert("Supprimer ce widget ?", "Il disparaîtra du dashboard public.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteW(row.id);
            success();
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Suppression impossible");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: space.lg, paddingBottom: 0 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: t.textMuted, fontWeight: "700" }}>‹ Retour</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 }} keyboardShouldPersistTaps="handled">
        <View>
          <Eyebrow>Édition</Eyebrow>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
            <Text style={{ fontSize: 26 }}>{def.emoji}</Text>
            <Text style={{ color: t.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }}>{def.label}</Text>
          </View>
        </View>

        {error ? <Banner text={error} /> : null}

        <View style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: space.md, gap: space.md }}>
          <TypeEditor type={row.type} config={config} onChange={setConfig} />
        </View>

        {/* Taille / format — appliqué au breakpoint choisi sur la page principale. */}
        <View style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: space.md, gap: space.md }}>
          <SectionTitle
            right={
              <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: t.textMuted, fontWeight: "700", fontSize: 12 }}>{bp === "mobile" ? "📱 Mobile" : "🖥️ Desktop"}</Text>
              </View>
            }
          >
            Taille
          </SectionTitle>
          <Muted>Format sur l'écran {bp === "mobile" ? "mobile (3 colonnes)" : "desktop (9 colonnes)"}. Enregistré aussitôt.</Muted>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {sizesForBreakpoint(bp).map((s) => (
              <Chip key={sizeLabel(s)} label={sizeLabel(s)} active={eqSize(s, row.layout[bp])} onPress={() => changeSize(s)} />
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: space.md }}>
          <ToggleRow label="Visible sur le dashboard" value={visible} onChange={setVis} hint="Masqué : conservé mais absent de /qrcode." />
        </View>

        <Button label="Enregistrer" onPress={save} loading={saving} />
        <Button label="⧉ Dupliquer le widget" onPress={duplicate} variant="ghost" />
        {row.type === "toile" ? <Button label="🎨 Réinitialiser la toile" onPress={confirmReset} variant="ghost" /> : null}
        <Button label="Supprimer le widget" onPress={confirmDelete} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}
