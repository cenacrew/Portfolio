import type { SiteChip, SiteSettingsRow } from "@portfolio/shared";
import { getSiteSettings, updateSiteSettings } from "@portfolio/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Button, Eyebrow, Muted, TextField, ToggleRow, success, tap } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { radius, space, useTheme } from "../../lib/theme";

type Draft = Pick<
  SiteSettingsRow,
  "name" | "tagline" | "available_text" | "available_show" | "location" | "location_show" | "chips"
>;

const FALLBACK: Draft = {
  name: "Valentin Sourdois Pajot",
  tagline: "Développeur Full-Stack · créatif du numérique",
  available_text: "Dispo pour un projet",
  available_show: true,
  location: "Bordeaux",
  location_show: true,
  chips: [],
};

export default function HeaderEditor() {
  const t = useTheme();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    getSiteSettings(supabase)
      .then((row) => {
        if (!alive) return;
        setDraft(row ? { ...FALLBACK, ...row, chips: Array.isArray(row.chips) ? row.chips : [] } : FALLBACK);
      })
      .catch(() => alive && setDraft(FALLBACK));
    return () => {
      alive = false;
    };
  }, []);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const setChip = (i: number, label: string) =>
    setDraft((d) => (d ? { ...d, chips: d.chips.map((c, idx) => (idx === i ? { label } : c)) } : d));
  const addChip = () => setDraft((d) => (d ? { ...d, chips: [...d.chips, { label: "" } as SiteChip] } : d));
  const removeChip = (i: number) => setDraft((d) => (d ? { ...d, chips: d.chips.filter((_, idx) => idx !== i) } : d));

  const save = async () => {
    if (!draft) return;
    setError(null);
    setSaving(true);
    try {
      await updateSiteSettings(supabase, {
        ...draft,
        chips: draft.chips.filter((c) => c.label.trim().length > 0),
      });
      success();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  if (!draft) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={t.brand} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ padding: space.lg, paddingBottom: 0 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: t.textMuted, fontWeight: "700" }}>‹ Retour</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xl * 2 }} keyboardShouldPersistTaps="handled">
        <View>
          <Eyebrow>En-tête public</Eyebrow>
          <Text style={{ color: t.text, fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: 4 }}>Infos du dashboard</Text>
          <Muted style={{ marginTop: 4 }}>Nom, sous-titre et pastilles affichés en haut de /qrcode.</Muted>
        </View>

        {error ? <Banner text={error} /> : null}

        <View style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: space.md, gap: space.md }}>
          <TextField label="Nom" value={draft.name} onChange={(v) => set("name", v)} />
          <TextField label="Sous-titre" value={draft.tagline} onChange={(v) => set("tagline", v)} multiline />
        </View>

        <View style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: space.md, gap: space.md }}>
          <ToggleRow label="Pastille « dispo »" value={draft.available_show} onChange={(v) => set("available_show", v)} hint="Garde le point vert clignotant." />
          <TextField label="Texte de la pastille dispo" value={draft.available_text} onChange={(v) => set("available_text", v)} placeholder="Dispo pour un projet" />
        </View>

        <View style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: space.md, gap: space.md }}>
          <ToggleRow label="Pastille localisation" value={draft.location_show} onChange={(v) => set("location_show", v)} />
          <TextField label="Lieu" value={draft.location} onChange={(v) => set("location", v)} placeholder="Bordeaux" />
        </View>

        <View style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: space.md, gap: space.sm }}>
          <Text style={{ color: t.text, fontWeight: "700", fontSize: 14 }}>Pastilles supplémentaires</Text>
          {draft.chips.map((c, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextField label={`Pastille ${i + 1}`} value={c.label} onChange={(v) => setChip(i, v)} />
              </View>
              <Pressable onPress={() => { tap(); removeChip(i); }} style={{ paddingVertical: 12, paddingHorizontal: 4 }}>
                <Text style={{ color: t.danger, fontWeight: "700" }}>Retirer</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={() => { tap(); addChip(); }} style={{ borderWidth: 1.5, borderColor: t.border, borderStyle: "dashed", borderRadius: radius.sm, padding: 12, alignItems: "center" }}>
            <Text style={{ color: t.textMuted, fontWeight: "700" }}>+ Ajouter une pastille</Text>
          </Pressable>
        </View>

        <Button label="Enregistrer" onPress={save} loading={saving} />
      </ScrollView>
    </SafeAreaView>
  );
}
