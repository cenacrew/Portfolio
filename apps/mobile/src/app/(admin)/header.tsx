import type { Mood, SiteChip, SiteSettingsRow } from "@portfolio/shared";
import { DEFAULT_MOODS, getSiteSettings, updateSiteSettings } from "@portfolio/shared";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Button, Eyebrow, Muted, TextField, ToggleRow, success, tap } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { radius, space, useTheme } from "../../lib/theme";

type Draft = Pick<
  SiteSettingsRow,
  "name" | "tagline" | "available_text" | "available_show" | "location" | "location_show" | "chips"
> & {
  status_emoji: string;
  status_text: string;
  status_moods: Mood[];
};

const FALLBACK: Draft = {
  name: "Valentin Sourdois Pajot",
  tagline: "Développeur Full-Stack · créatif du numérique",
  available_text: "Dispo pour un projet",
  available_show: true,
  location: "Bordeaux",
  location_show: true,
  chips: [],
  status_emoji: "💻",
  status_text: "En train de coder",
  status_moods: [],
};

export default function HeaderEditor() {
  const t = useTheme();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newEmoji, setNewEmoji] = useState("");
  const [newText, setNewText] = useState("");

  useEffect(() => {
    let alive = true;
    getSiteSettings(supabase)
      .then((row) => {
        if (!alive) return;
        setDraft(
          row
            ? {
                ...FALLBACK,
                ...row,
                chips: Array.isArray(row.chips) ? row.chips : [],
                status_emoji: row.status_emoji || FALLBACK.status_emoji,
                status_text: row.status_text || FALLBACK.status_text,
                status_moods: Array.isArray(row.status_moods) ? (row.status_moods as Mood[]) : [],
              }
            : FALLBACK,
        );
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

        {/* Statut / humeur — affiché dans l'en-tête public (phase 4.8 B2). */}
        <View style={{ backgroundColor: t.surface, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, padding: space.md, gap: space.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 20 }}>{draft.status_emoji || "💬"}</Text>
            <Text style={{ color: t.text, fontWeight: "800" }}>Statut du moment</Text>
          </View>
          <View style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-end" }}>
            <View style={{ width: 70 }}>
              <Text style={{ color: t.text, fontWeight: "700", fontSize: 14, marginBottom: 6 }}>Emoji</Text>
              <TextInput
                value={draft.status_emoji}
                onChangeText={(v) => set("status_emoji", v.slice(0, 4))}
                placeholder="💻"
                placeholderTextColor={t.textFaint}
                style={{ backgroundColor: t.surfaceAlt, borderRadius: radius.sm, borderWidth: 1, borderColor: t.border, paddingHorizontal: 14, paddingVertical: 12, color: t.text, fontSize: 22, textAlign: "center" }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Statut" value={draft.status_text} onChange={(v) => set("status_text", v)} placeholder="En train de coder" />
            </View>
          </View>

          <Text style={{ color: t.textMuted, fontSize: 12 }}>Humeurs rapides — touche pour appliquer.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: "center" }}>
            {[...DEFAULT_MOODS, ...draft.status_moods].map((m, i) => (
              <Pressable
                key={`${m.emoji}-${m.text}-${i}`}
                onPress={() => {
                  tap();
                  setDraft((d) => (d ? { ...d, status_emoji: m.emoji, status_text: m.text } : d));
                }}
                style={{ borderWidth: 1.5, borderColor: t.border, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 12, flexDirection: "row", gap: 6, alignItems: "center" }}
              >
                <Text style={{ fontSize: 15 }}>{m.emoji}</Text>
                <Text style={{ color: t.textMuted, fontWeight: "700", fontSize: 12 }}>{m.text}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* "+" — add a custom mood to the persisted list. */}
          <View style={{ flexDirection: "row", gap: space.sm, alignItems: "flex-end" }}>
            <View style={{ width: 62 }}>
              <TextInput
                value={newEmoji}
                onChangeText={(v) => setNewEmoji(v.slice(0, 4))}
                placeholder="🌙"
                placeholderTextColor={t.textFaint}
                style={{ backgroundColor: t.surfaceAlt, borderRadius: radius.sm, borderWidth: 1, borderColor: t.border, paddingHorizontal: 12, paddingVertical: 10, color: t.text, fontSize: 20, textAlign: "center" }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Nouvelle humeur" value={newText} onChange={setNewText} placeholder="Ex : Day off" />
            </View>
            <Pressable
              onPress={() => {
                const emoji = newEmoji.trim();
                if (!emoji) return;
                tap();
                setDraft((d) => (d ? { ...d, status_moods: [...d.status_moods, { emoji, text: newText.trim() || emoji }] } : d));
                setNewEmoji("");
                setNewText("");
              }}
              style={{ borderWidth: 1.5, borderColor: t.accent, borderRadius: radius.sm, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 1 }}
            >
              <Text style={{ color: t.accent, fontWeight: "800" }}>+</Text>
            </Pressable>
          </View>
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
