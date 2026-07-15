import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { radius, space, useTheme } from "../lib/theme";
import { useDashboards } from "../lib/dashboards";
import { Banner, Button, tap } from "./ui";

// Version selector for the mobile admin (phase 8). A horizontal strip of version
// pills at the top of the main screen; the whole app operates on the selected
// one. "Gérer" opens a small sheet to create, duplicate or delete versions.
export function VersionSelector() {
  const t = useTheme();
  const { dashboards, selected, migrated, select, create, duplicate, remove } = useDashboards();

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"menu" | "name">("menu");
  const [mode, setMode] = useState<"create" | "duplicate">("create");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const openSheet = () => {
    tap();
    setStage("menu");
    setErr(null);
    setOpen(true);
  };
  const close = () => {
    if (busy) return;
    setOpen(false);
  };

  const startCreate = () => {
    setMode("create");
    setName("");
    setErr(null);
    setStage("name");
  };
  const startDuplicate = () => {
    setMode("duplicate");
    setName(`${selected.name || "Version"} (copie)`);
    setErr(null);
    setStage("name");
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Donne un nom à la version.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      if (mode === "duplicate") await duplicate(trimmed);
      else await create(trimmed);
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      `Supprimer « ${selected.name} » ?`,
      "Ses widgets et les médias qu'aucune autre version n'utilise seront effacés. Sans effet sur les autres versions.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await remove();
              setOpen(false);
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Suppression impossible.");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ gap: space.sm }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, alignItems: "center", paddingRight: space.sm }}
      >
        {dashboards.map((d) => {
          const on = d.slug === selected.slug;
          return (
            <Pressable
              key={d.slug}
              onPress={() => {
                if (!on) {
                  tap();
                  select(d.slug);
                }
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: radius.pill,
                backgroundColor: on ? t.brand : t.surface,
                borderWidth: 1,
                borderColor: on ? t.brand : t.border,
              }}
            >
              {d.is_default ? (
                <Text style={{ fontSize: 12, color: on ? t.onBrand : t.textMuted }}>★</Text>
              ) : null}
              <Text style={{ color: on ? t.onBrand : t.text, fontWeight: "800", fontSize: 13 }}>
                {d.name || d.slug}
              </Text>
            </Pressable>
          );
        })}

        {migrated ? (
          <Pressable
            onPress={openSheet}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: radius.pill,
              borderWidth: 1.5,
              borderColor: t.border,
              borderStyle: "dashed",
            }}
          >
            <Text style={{ color: t.textMuted, fontWeight: "800", fontSize: 13 }}>⋯ Gérer</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          onPress={close}
          style={{ flex: 1, backgroundColor: t.overlay, justifyContent: "flex-end" }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: t.bg,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              padding: space.lg,
              paddingBottom: space.xl,
              gap: space.md,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 2 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border }} />
            </View>

            {stage === "menu" ? (
              <>
                <Text style={{ color: t.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 }}>
                  Versions du dashboard
                </Text>
                <Text style={{ color: t.textMuted, fontSize: 13 }}>
                  Version active : {selected.name || selected.slug}
                  {selected.is_default ? " (par défaut)" : ""}.
                </Text>
                {err ? <Banner text={err} /> : null}
                <Button label="➕ Nouvelle version" onPress={startCreate} />
                <Button label="⧉ Dupliquer cette version" onPress={startDuplicate} variant="ghost" />
                {!selected.is_default ? (
                  <Button label="🗑 Supprimer cette version" onPress={confirmDelete} variant="danger" />
                ) : null}
                <Button label="Fermer" onPress={close} variant="ghost" />
              </>
            ) : (
              <>
                <Text style={{ color: t.text, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 }}>
                  {mode === "duplicate" ? "Dupliquer la version" : "Nouvelle version"}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: 13 }}>
                  {mode === "duplicate"
                    ? "Copie les widgets et l'en-tête ; les médias sont partagés, pas ré-uploadés."
                    : "Une nouvelle version vide, avec sa propre URL."}
                </Text>
                {err ? <Banner text={err} /> : null}
                <TextInput
                  autoFocus
                  value={name}
                  onChangeText={setName}
                  placeholder="Nom de la version"
                  placeholderTextColor={t.textFaint}
                  maxLength={60}
                  editable={!busy}
                  style={{
                    backgroundColor: t.surface,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: t.border,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    color: t.text,
                    fontSize: 16,
                  }}
                />
                <View style={{ flexDirection: "row", gap: space.sm }}>
                  <Button
                    label="‹ Retour"
                    onPress={() => setStage("menu")}
                    variant="ghost"
                    style={{ flex: 1 }}
                    disabled={busy}
                  />
                  <Pressable
                    onPress={submit}
                    disabled={busy}
                    style={{
                      flex: 1,
                      minHeight: 50,
                      borderRadius: radius.pill,
                      backgroundColor: t.brand,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {busy ? (
                      <ActivityIndicator color={t.onBrand} />
                    ) : (
                      <Text style={{ color: t.onBrand, fontWeight: "800", fontSize: 15 }}>
                        {mode === "duplicate" ? "Dupliquer" : "Créer"}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
