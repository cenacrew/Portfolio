import { GAME_ACCENTS, getAdminStats, type AdminStats } from "@portfolio/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner, Eyebrow, Muted } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { radius, space, useTheme, type Palette } from "../../lib/theme";

// Admin mini-stats (phase 14). A coin-op scoreboard read of the public
// dashboard: the two lifetime totals lead in big tabular numerals, then the
// live breakdowns — poll bars, reaction tallies, and a per-game high-score
// board tinted with each game's signature accent. Pull to refresh. All reads go
// through the authenticated Supabase session (RLS) via packages/shared.

const num = (n: number) => n.toLocaleString("fr-FR");

export default function Stats() {
  const t = useTheme();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh?: boolean) => {
    if (refresh) setRefreshing(true);
    try {
      const data = await getAdminStats(supabase);
      setStats(data);
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
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <View style={{ padding: space.lg, paddingBottom: space.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={{ color: t.textMuted, fontWeight: "700" }}>‹ Retour</Text>
        </Pressable>
        <View style={{ marginTop: 8 }}>
          <Eyebrow>Coulisses</Eyebrow>
          <Text style={{ color: t.text, fontSize: 30, fontWeight: "800", letterSpacing: -0.6 }}>Statistiques</Text>
          <Muted style={{ marginTop: 4 }}>Ce que le public a laissé sur le dashboard. Balaie pour rafraîchir.</Muted>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={t.brand} size="large" style={{ marginTop: space.xl }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: space.lg, paddingTop: 0, gap: space.lg, paddingBottom: space.xl * 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={t.brand} />}
        >
          {error ? <Banner text={error} /> : null}

          {stats ? (
            <>
              {/* Lifetime totals — the two headline numbers, breathing room around them. */}
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <HeroMetric t={t} value={num(stats.visits)} label="Visites" />
                <HeroMetric
                  t={t}
                  value={num(stats.guestbook.words)}
                  label="Mots au livre d'or"
                  sub={`${num(stats.guestbook.messages)} message${stats.guestbook.messages > 1 ? "s" : ""}`}
                />
              </View>

              {/* Polls */}
              <Section t={t} title="Sondages">
                {stats.polls.length === 0 ? (
                  <EmptyLine t={t} text="Aucun sondage sur le dashboard." />
                ) : (
                  stats.polls.map((p) => <PollCard key={p.widgetId} t={t} poll={p} />)
                )}
              </Section>

              {/* Reactions */}
              <Section t={t} title="Réactions">
                {stats.reactions.length === 0 ? (
                  <EmptyLine t={t} text="Aucun widget de réactions." />
                ) : (
                  stats.reactions.map((r) => <ReactionCard key={r.widgetId} t={t} reaction={r} />)
                )}
              </Section>

              {/* Games — arcade high-score board */}
              <Section t={t} title="Mini-jeux">
                <View style={{ flexDirection: "row", gap: space.sm }}>
                  {stats.games.map((g) => (
                    <GameCard key={g.game} t={t} game={g} />
                  ))}
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

function HeroMetric({ t, value, label, sub }: { t: Palette; value: string; label: string; sub?: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: t.border,
        padding: space.md,
        gap: 4,
        minHeight: 132,
        justifyContent: "space-between",
      }}
    >
      <Text
        style={{
          color: t.text,
          fontSize: 44,
          fontWeight: "800",
          letterSpacing: -1.5,
          fontVariant: ["tabular-nums"],
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <View>
        <Text style={{ color: t.textMuted, fontSize: 13, fontWeight: "700" }}>{label}</Text>
        {sub ? <Text style={{ color: t.textFaint, fontSize: 12, marginTop: 2 }}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function Section({ t, title, children }: { t: Palette; title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={{ color: t.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.2 }}>{title}</Text>
      <View style={{ gap: space.sm }}>{children}</View>
    </View>
  );
}

function EmptyLine({ t, text }: { t: Palette; text: string }) {
  return (
    <View
      style={{
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: t.border,
        borderStyle: "dashed",
        padding: space.md,
      }}
    >
      <Text style={{ color: t.textFaint, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

function PollCard({ t, poll }: { t: Palette; poll: AdminStats["polls"][number] }) {
  const max = Math.max(1, ...poll.options.map((o) => o.count));
  return (
    <View
      style={{
        backgroundColor: t.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: t.border,
        padding: space.md,
        gap: space.sm,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.sm }}>
        <Text style={{ color: t.text, fontWeight: "800", fontSize: 15, flex: 1 }} numberOfLines={2}>
          {poll.question}
        </Text>
        <Text style={{ color: t.textFaint, fontSize: 12, fontWeight: "700" }}>
          {num(poll.total)} vote{poll.total > 1 ? "s" : ""}
        </Text>
      </View>
      <View style={{ gap: 8 }}>
        {poll.options.map((o, i) => {
          const pct = poll.total > 0 ? Math.round((o.count / poll.total) * 100) : 0;
          return (
            <View key={i} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.sm }}>
                <Text style={{ color: t.textMuted, fontSize: 13, flex: 1 }} numberOfLines={1}>
                  {o.label}
                </Text>
                <Text style={{ color: t.text, fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] }}>
                  {num(o.count)} · {pct}%
                </Text>
              </View>
              {/* Proportion bar — filled relative to the leading option so the
                  winner reads instantly even at low vote counts. */}
              <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surfaceAlt, overflow: "hidden" }}>
                <View
                  style={{
                    height: "100%",
                    width: `${Math.round((o.count / max) * 100)}%`,
                    backgroundColor: t.accent,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ReactionCard({ t, reaction }: { t: Palette; reaction: AdminStats["reactions"][number] }) {
  return (
    <View
      style={{
        backgroundColor: t.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: t.border,
        padding: space.md,
        gap: space.sm,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.sm }}>
        <Text style={{ color: t.text, fontWeight: "800", fontSize: 15, flex: 1 }} numberOfLines={1}>
          {reaction.title}
        </Text>
        <Text style={{ color: t.textFaint, fontSize: 12, fontWeight: "700" }}>{num(reaction.total)} au total</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {reaction.items.map((it, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: t.surfaceAlt,
              borderRadius: radius.pill,
              paddingVertical: 6,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ fontSize: 18 }}>{it.emoji}</Text>
            <Text style={{ color: t.text, fontWeight: "800", fontSize: 14, fontVariant: ["tabular-nums"] }}>
              {num(it.count)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function GameCard({ t, game }: { t: Palette; game: AdminStats["games"][number] }) {
  const accent = GAME_ACCENTS[game.game];
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: t.border,
        padding: space.md,
        gap: space.sm,
        overflow: "hidden",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accent }} />
        <Text style={{ color: t.text, fontWeight: "800", fontSize: 15 }}>{game.label}</Text>
      </View>
      <View>
        <Text style={{ color: t.textFaint, fontSize: 11, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase" }}>
          Meilleur score
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
          <Text style={{ color: accent, fontSize: 34, fontWeight: "800", letterSpacing: -1, fontVariant: ["tabular-nums"] }}>
            {num(game.topScore)}
          </Text>
          {game.topPseudo ? (
            <Text style={{ color: t.textMuted, fontSize: 15, fontWeight: "800", letterSpacing: 1 }}>{game.topPseudo}</Text>
          ) : null}
        </View>
      </View>
      <Text style={{ color: t.textFaint, fontSize: 12 }}>
        {num(game.plays)} partie{game.plays > 1 ? "s" : ""} jouée{game.plays > 1 ? "s" : ""}
      </Text>
    </View>
  );
}
