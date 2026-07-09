import type { WidgetRow } from "@portfolio/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TypeEditor } from "../../../components/editors";
import { Banner, Button, Eyebrow, ToggleRow, success } from "../../../components/ui";
import { deleteW, saveConfig, setVisible } from "../../../lib/actions";
import { meta } from "../../../lib/registry";
import { supabase } from "../../../lib/supabase";
import { radius, space, useTheme } from "../../../lib/theme";

export default function EditWidget() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const router = useRouter();

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

        <View style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: space.md }}>
          <ToggleRow label="Visible sur le dashboard" value={visible} onChange={setVis} hint="Masqué : conservé mais absent de /qrcode." />
        </View>

        <Button label="Enregistrer" onPress={save} loading={saving} />
        <Button label="Supprimer le widget" onPress={confirmDelete} variant="danger" />
      </ScrollView>
    </SafeAreaView>
  );
}
