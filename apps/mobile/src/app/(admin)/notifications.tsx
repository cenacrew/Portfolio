import {
  getNotificationPrefs,
  updateNotificationPrefs,
  type NotificationPrefsRow,
  type NotificationPrefsUpdate,
  type VisitsNotifyMode,
} from "@portfolio/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Eyebrow, Muted, tap } from "../../components/ui";
import { pushSupported, registerForPushNotifications } from "../../lib/push";
import { supabase } from "../../lib/supabase";
import { radius, space, useTheme, type Palette } from "../../lib/theme";

// Notifications preferences (phase 15). A settings screen in the app's own
// language: navy/cream, one amber accent for the "on" state. Each source says
// in plain words what makes the phone buzz; visits get a three-way mode because
// "every visit" is deliberately noisy. Prefs live on the server (one row shared
// by every device), so a change here silences or wakes ALL registered phones.
// Remote push needs the installed build — in Expo Go the screen still works but
// registration is a documented no-op.

type SourceKey = "guestbook" | "toile" | "poll" | "reactions" | "games";

const SOURCES: { key: SourceKey; field: keyof NotificationPrefsRow; glyph: string; title: string; blurb: string }[] = [
  { key: "guestbook", field: "guestbook_enabled", glyph: "💌", title: "Livre d'or", blurb: "Quand un visiteur laisse un mot." },
  { key: "toile", field: "toile_enabled", glyph: "🎨", title: "La toile", blurb: "Quand quelqu'un ajoute un dessin." },
  { key: "poll", field: "poll_enabled", glyph: "🗳️", title: "Sondage", blurb: "Quand un vote est enregistré." },
  { key: "reactions", field: "reactions_enabled", glyph: "❤️", title: "Réactions", blurb: "Chaque emoji tapé. Peut être fréquent." },
  { key: "games", field: "games_enabled", glyph: "🕹️", title: "Mini-jeux", blurb: "Quand un score entre au classement." },
];

const VISITS_MODES: { value: VisitsNotifyMode; label: string; blurb: string }[] = [
  { value: "off", label: "Aucune", blurb: "Les visites ne déclenchent aucune notification." },
  { value: "instant", label: "Chaque visite", blurb: "Une notification à chaque visite. Volontairement bavard." },
  { value: "daily", label: "Résumé quotidien", blurb: "Un seul récapitulatif par jour, le matin." },
];

export default function Notifications() {
  const t = useTheme();
  const router = useRouter();
  const supported = pushSupported();

  const [prefs, setPrefs] = useState<NotificationPrefsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regState, setRegState] = useState<"idle" | "working" | "registered" | "denied">("idle");

  const load = useCallback(async () => {
    try {
      setPrefs(await getNotificationPrefs(supabase));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Persist one field. Optimistic: flip the UI, roll back if the write fails.
  const patch = useCallback(
    async (update: NotificationPrefsUpdate) => {
      if (!prefs) return;
      const previous = prefs;
      setPrefs({ ...prefs, ...update });
      try {
        const saved = await updateNotificationPrefs(supabase, update);
        setPrefs(saved);
        setError(null);
      } catch (e) {
        setPrefs(previous);
        setError(e instanceof Error ? e.message : "Enregistrement impossible.");
      }
    },
    [prefs],
  );

  const enableOnThisDevice = useCallback(async () => {
    tap();
    setRegState("working");
    const result = await registerForPushNotifications();
    if (result.status === "registered") {
      setRegState("registered");
      setError(null);
    } else if (result.status === "denied") {
      setRegState("denied");
      setError(null);
    } else {
      // "error" or "unsupported": show the concrete reason, never a blind message.
      setRegState("idle");
      setError(result.reason ?? "Activation impossible sur cet appareil.");
    }
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ padding: space.lg, paddingBottom: space.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={{ color: t.textMuted, fontWeight: "700" }}>‹ Retour</Text>
        </Pressable>
        <View style={{ marginTop: 8 }}>
          <Eyebrow>Coulisses</Eyebrow>
          <Text style={{ color: t.text, fontSize: 30, fontWeight: "800", letterSpacing: -0.6 }}>Notifications</Text>
          <Muted style={{ marginTop: 4 }}>
            Choisis ce qui fait vibrer ton téléphone. Ces réglages valent pour tous tes appareils connectés.
          </Muted>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={t.brand} size="large" style={{ marginTop: space.xl }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, gap: space.lg, paddingBottom: space.xl * 2 }}>
          {error ? <Banner text={error} /> : null}

          <DeviceStatus t={t} supported={supported} regState={regState} onEnable={enableOnThisDevice} />

          {prefs ? (
            <>
              <Section t={t} title="Sources" subtitle="Un interrupteur par type d'événement.">
                <View style={cardStyle(t)}>
                  {SOURCES.map((s, i) => (
                    <SourceRow
                      key={s.key}
                      t={t}
                      glyph={s.glyph}
                      title={s.title}
                      blurb={s.blurb}
                      value={Boolean(prefs[s.field])}
                      first={i === 0}
                      onToggle={(v) => patch({ [s.field]: v } as NotificationPrefsUpdate)}
                    />
                  ))}
                </View>
              </Section>

              <Section t={t} title="Visites" subtitle="« Chaque visite » peut être bruyant — d'où le résumé quotidien.">
                <View style={{ ...cardStyle(t), gap: space.md }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {VISITS_MODES.map((m) => (
                      <ModeChip
                        key={m.value}
                        t={t}
                        label={m.label}
                        active={prefs.visits_mode === m.value}
                        onPress={() => patch({ visits_mode: m.value })}
                      />
                    ))}
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: 13, lineHeight: 19 }}>
                    {VISITS_MODES.find((m) => m.value === prefs.visits_mode)?.blurb}
                  </Text>
                </View>
              </Section>
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---- Building blocks -------------------------------------------------------

function cardStyle(t: Palette) {
  return {
    backgroundColor: t.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    padding: space.md,
  } as const;
}

function Section({ t, title, subtitle, children }: { t: Palette; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <View>
        <Text style={{ color: t.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.2 }}>{title}</Text>
        <Text style={{ color: t.textFaint, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

// The device registration strip. It leads the screen because a toggle means
// nothing until this phone can actually receive a push.
function DeviceStatus({
  t,
  supported,
  regState,
  onEnable,
}: {
  t: Palette;
  supported: boolean;
  regState: "idle" | "working" | "registered" | "denied";
  onEnable: () => void;
}) {
  if (!supported) {
    return (
      <View style={{ ...cardStyle(t), flexDirection: "row", gap: space.md, alignItems: "flex-start", borderColor: t.accent, borderStyle: "dashed" }}>
        <Text style={{ fontSize: 22, marginTop: -1 }}>🔕</Text>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: t.text, fontWeight: "800", fontSize: 15 }}>Indisponible dans Expo Go</Text>
          <Text style={{ color: t.textMuted, fontSize: 13, lineHeight: 19 }}>
            Les notifications distantes ont besoin de l'app installée (build). Tes préférences ci-dessous restent
            enregistrées et s'appliqueront dès l'app installée.
          </Text>
        </View>
      </View>
    );
  }

  const registered = regState === "registered";
  const denied = regState === "denied";
  return (
    <View style={{ ...cardStyle(t), flexDirection: "row", gap: space.md, alignItems: "center" }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.sm,
          backgroundColor: registered ? t.accent + "22" : t.surfaceAlt,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 22 }}>{registered ? "🔔" : "🔕"}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: t.text, fontWeight: "800", fontSize: 15 }}>
          {registered ? "Cet appareil est prêt" : denied ? "Autorisation refusée" : "Activer sur cet appareil"}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: 13, lineHeight: 19 }}>
          {registered
            ? "Il recevra les notifications activées ci-dessous."
            : denied
              ? "Autorise les notifications dans les réglages du téléphone, puis réessaie."
              : "Autorise les notifications pour recevoir les alertes sur ce téléphone."}
        </Text>
      </View>
      {!registered ? (
        <Pressable
          onPress={onEnable}
          disabled={regState === "working"}
          style={({ pressed }) => [
            {
              backgroundColor: t.brand,
              borderRadius: radius.pill,
              paddingVertical: 10,
              paddingHorizontal: 16,
              minWidth: 88,
              alignItems: "center",
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          {regState === "working" ? (
            <ActivityIndicator color={t.onBrand} />
          ) : (
            <Text style={{ color: t.onBrand, fontWeight: "800", fontSize: 13 }}>{denied ? "Réessayer" : "Activer"}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

function SourceRow({
  t,
  glyph,
  title,
  blurb,
  value,
  first,
  onToggle,
}: {
  t: Palette;
  glyph: string;
  title: string;
  blurb: string;
  value: boolean;
  first: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onToggle(!value);
      }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingVertical: space.sm + 2,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.border,
      }}
    >
      <Text style={{ fontSize: 22 }}>{glyph}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text, fontWeight: "700", fontSize: 15 }}>{title}</Text>
        <Text style={{ color: t.textFaint, fontSize: 12, marginTop: 1 }}>{blurb}</Text>
      </View>
      <View
        style={{
          width: 52,
          height: 30,
          borderRadius: radius.pill,
          backgroundColor: value ? t.accent : t.border,
          padding: 3,
          justifyContent: "center",
          alignItems: value ? "flex-end" : "flex-start",
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: t.surface,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 2,
          }}
        />
      </View>
    </Pressable>
  );
}

function ModeChip({ t, label, active, onPress }: { t: Palette; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={{
        flex: 1,
        backgroundColor: active ? t.brand : "transparent",
        borderColor: active ? t.brand : t.border,
        borderWidth: 1.5,
        borderRadius: radius.pill,
        paddingVertical: 10,
        alignItems: "center",
      }}
    >
      <Text style={{ color: active ? t.onBrand : t.textMuted, fontWeight: "800", fontSize: 12.5 }}>{label}</Text>
    </Pressable>
  );
}
