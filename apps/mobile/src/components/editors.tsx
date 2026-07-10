import type { WidgetType } from "@portfolio/shared";
import { LOL_MODE_LABELS, SOCIAL_PLATFORMS, TECH_KEYS } from "@portfolio/shared";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { uploadImage, uploadVideo } from "../lib/actions";
import { radius, space, useTheme } from "../lib/theme";
import { EmojiPickerRow, Field, NumberFieldRow, SelectRow, SliderRow, TextField, ToggleRow, tap } from "./ui";

// Pick an image from the library and upload it to widget-media, returning the
// public URL through onDone. Used by the photo editor now that the top-bar
// "post a photo" shortcut is gone (tap a tile to manage its media).
function PickImageButton({ onDone }: { onDone: (url: string) => void }) {
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Accès refusé", "Autorise l'accès aux photos pour en importer une.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (res.canceled || !res.assets[0]?.uri) return;
    setBusy(true);
    try {
      const asset = res.assets[0];
      const url = await uploadImage(asset.uri, asset.mimeType ?? "image/jpeg", asset.fileSize);
      onDone(url);
      tap();
    } catch (e) {
      Alert.alert("Échec de l'import", e instanceof Error ? e.message : "Réessaie.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Pressable
      onPress={pick}
      disabled={busy}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: t.accent, borderRadius: radius.sm, paddingVertical: 12 }}
    >
      {busy ? <ActivityIndicator color={t.accent} /> : <Text style={{ color: t.accent, fontWeight: "800" }}>📷 Importer une image</Text>}
    </Pressable>
  );
}

// Pick a video from the library and upload it. ~50 Mo limit enforced in uploadVideo.
function PickVideoButton({ onDone }: { onDone: (url: string) => void }) {
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Accès refusé", "Autorise l'accès à ta galerie pour importer une vidéo.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], quality: 1 });
    if (res.canceled || !res.assets[0]?.uri) return;
    setBusy(true);
    try {
      const asset = res.assets[0];
      const url = await uploadVideo(asset.uri, asset.mimeType ?? "video/mp4", asset.fileSize);
      onDone(url);
      tap();
    } catch (e) {
      Alert.alert("Échec de l'import", e instanceof Error ? e.message : "Réessaie.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Pressable
      onPress={pick}
      disabled={busy}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: t.accent, borderRadius: radius.sm, paddingVertical: 12 }}
    >
      {busy ? <ActivityIndicator color={t.accent} /> : <Text style={{ color: t.accent, fontWeight: "800" }}>🎞️ Importer une vidéo</Text>}
    </Pressable>
  );
}

// Per-type edit forms for the mobile admin. Each mirrors the web Editor but is
// implemented in React Native. The parent screen validates the resulting config
// against the SHARED Zod schema before saving, so these only shape the input.

type EProps<T = any> = { config: T; onChange: (next: T) => void };

// --- small array editor -----------------------------------------------------

function ListEditor<T>({
  label,
  items,
  onChange,
  makeItem,
  renderItem,
  min = 1,
  addLabel = "Ajouter",
}: {
  label: string;
  items: T[];
  onChange: (next: T[]) => void;
  makeItem: () => T;
  renderItem: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  min?: number;
  addLabel?: string;
}) {
  const t = useTheme();
  const update = (i: number, patch: Partial<T>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <Field label={label}>
      <View style={{ gap: space.sm }}>
        {items.map((item, i) => (
          <View key={i} style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.sm, padding: 12, gap: 8 }}>
            {renderItem(item, (patch) => update(i, patch))}
            <Pressable
              onPress={() => {
                tap();
                remove(i);
              }}
              disabled={items.length <= min}
              style={{ alignSelf: "flex-end", opacity: items.length <= min ? 0.4 : 1 }}
            >
              <Text style={{ color: t.danger, fontWeight: "700", fontSize: 13 }}>Retirer</Text>
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={() => {
            tap();
            onChange([...items, makeItem()]);
          }}
          style={{ borderWidth: 1.5, borderColor: t.border, borderStyle: "dashed", borderRadius: radius.sm, padding: 12, alignItems: "center" }}
        >
          <Text style={{ color: t.textMuted, fontWeight: "700" }}>+ {addLabel}</Text>
        </Pressable>
      </View>
    </Field>
  );
}

const opt = <T extends string>(values: readonly T[]): { value: T; label: string }[] =>
  values.map((v) => ({ value: v, label: v }));

// --- editors per type -------------------------------------------------------

// URL templates per platform (phase 4.8 C4): picking a known platform pre-fills
// the URL with a {pseudo} placeholder to replace. Empty for "generic"/"email".
const SOCIAL_TEMPLATES: Record<string, string> = {
  github: "https://github.com/{pseudo}",
  linkedin: "https://linkedin.com/in/{pseudo}",
  instagram: "https://instagram.com/{pseudo}",
  x: "https://x.com/{pseudo}",
  discord: "https://discord.gg/{pseudo}",
  youtube: "https://youtube.com/@{pseudo}",
  twitch: "https://twitch.tv/{pseudo}",
  email: "mailto:{pseudo}",
};
const ALL_TEMPLATES = new Set(Object.values(SOCIAL_TEMPLATES));

function SocialLinkEditor({ config, onChange }: EProps) {
  const onPlatform = (platform: string) => {
    const template = SOCIAL_TEMPLATES[platform];
    // Only overwrite the URL when it's empty or still an untouched template, so
    // a real URL the admin typed is never clobbered.
    const url = config.url;
    const replace = !url || ALL_TEMPLATES.has(url) || url === "https://example.com";
    onChange({ ...config, platform, url: replace && template ? template : url });
  };
  return (
    <>
      <SelectRow label="Plateforme" value={config.platform} options={opt(SOCIAL_PLATFORMS)} onChange={onPlatform} />
      <TextField label="URL" value={config.url} onChange={(url) => onChange({ ...config, url })} keyboardType="url" autoCapitalize="none" hint="Remplace {pseudo} par ton identifiant." />
      <TextField label="Pseudo (optionnel)" value={config.handle ?? ""} onChange={(handle) => onChange({ ...config, handle: handle || undefined })} autoCapitalize="none" />
      <TextField label="Libellé (optionnel)" value={config.label ?? ""} onChange={(label) => onChange({ ...config, label: label || undefined })} />
    </>
  );
}

function NoteEditor({ config, onChange }: EProps) {
  return (
    <>
      <TextField label="Texte" value={config.text} onChange={(text) => onChange({ ...config, text })} multiline hint="Markdown léger : **gras**, *italique*." />
      <SelectRow
        label="Couleur"
        value={config.tone}
        options={[
          { value: "cream", label: "Crème" },
          { value: "blue", label: "Bleu" },
          { value: "amber", label: "Ambre" },
          { value: "rose", label: "Rose" },
        ]}
        onChange={(tone) => onChange({ ...config, tone })}
      />
      <TextField label="Signature (optionnel)" value={config.signature ?? ""} onChange={(signature) => onChange({ ...config, signature: signature || undefined })} />
    </>
  );
}

function StatusEditor({ config, onChange }: EProps) {
  return (
    <>
      <EmojiPickerRow label="Emoji" value={config.emoji} onChange={(emoji) => onChange({ ...config, emoji })} />
      <TextField label="Emoji personnalisé" value={config.emoji} onChange={(emoji) => onChange({ ...config, emoji })} hint="Ou colle n'importe quel emoji ici." />
      <TextField label="Statut" value={config.text} onChange={(text) => onChange({ ...config, text })} multiline />
      <TextField label="Mention (optionnel)" value={config.updated ?? ""} onChange={(updated) => onChange({ ...config, updated: updated || undefined })} placeholder="Mis à jour aujourd'hui" />
    </>
  );
}

function LocationOrWeatherEditor({ config, onChange, withZoom }: EProps & { withZoom?: boolean }) {
  const maLoc = config.mode === "ma-loc";
  return (
    <>
      {withZoom ? (
        <ToggleRow
          label="Utiliser « Ma loc »"
          value={maLoc}
          onChange={(on) => onChange({ ...config, mode: on ? "ma-loc" : "fixed" })}
          hint="La carte se cale sur la position de ce téléphone à chaque ouverture de l'app (autorisation requise)."
        />
      ) : null}
      <TextField label="Ville" value={config.city} onChange={(city) => onChange({ ...config, city })} />
      <NumberFieldRow label="Latitude" value={config.lat} onChange={(lat) => onChange({ ...config, lat })} />
      <NumberFieldRow label="Longitude" value={config.lng} onChange={(lng) => onChange({ ...config, lng })} />
      {withZoom ? (
        <SliderRow
          label="Zoom"
          value={config.zoom ?? 12}
          onChange={(zoom) => onChange({ ...config, zoom })}
          min={1}
          max={19}
          hint="1 = vue du monde, 19 = niveau rue."
        />
      ) : null}
      {withZoom ? <TextField label="Légende (optionnel)" value={config.caption ?? ""} onChange={(caption) => onChange({ ...config, caption: caption || undefined })} /> : null}
    </>
  );
}

function VideoEditor({ config, onChange }: EProps) {
  const t = useTheme();
  return (
    <>
      <PickVideoButton onDone={(src) => onChange({ ...config, src })} />
      {config.src ? (
        <Text style={{ color: t.textMuted, fontSize: 12 }} numberOfLines={1}>
          Vidéo actuelle : {config.src}
        </Text>
      ) : (
        <Text style={{ color: t.textFaint, fontSize: 12 }}>Aucune vidéo pour l'instant. Lecture auto muette en boucle sur le dashboard.</Text>
      )}
      <TextField label="URL vidéo (optionnel)" value={config.src} onChange={(src) => onChange({ ...config, src })} keyboardType="url" autoCapitalize="none" hint="Rempli automatiquement à l'import." />
      <TextField label="Légende (optionnel)" value={config.caption ?? ""} onChange={(caption) => onChange({ ...config, caption: caption || undefined })} />
    </>
  );
}

function GuestbookEditor({ config, onChange }: EProps) {
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <TextField label="Invitation" value={config.prompt} onChange={(prompt) => onChange({ ...config, prompt })} />
    </>
  );
}

function SpotifyEmbedEditor({ config, onChange }: EProps) {
  return (
    <>
      <TextField label="URL Spotify" value={config.url} onChange={(url) => onChange({ ...config, url })} keyboardType="url" autoCapitalize="none" hint="Lien open.spotify.com (playlist, album, titre)." />
      <TextField label="Titre (optionnel)" value={config.title ?? ""} onChange={(title) => onChange({ ...config, title: title || undefined })} />
    </>
  );
}

function NowPlayingEditor({ config, onChange }: EProps) {
  return (
    <>
      <ToggleRow label="En lecture" value={config.isPlaying} onChange={(isPlaying) => onChange({ ...config, isPlaying })} />
      <TextField label="Titre" value={config.track} onChange={(track) => onChange({ ...config, track })} />
      <TextField label="Artiste" value={config.artist} onChange={(artist) => onChange({ ...config, artist })} />
      <TextField label="Pochette (URL, optionnel)" value={config.albumArt ?? ""} onChange={(albumArt) => onChange({ ...config, albumArt: albumArt || undefined })} keyboardType="url" autoCapitalize="none" />
    </>
  );
}

function GithubStatsEditor({ config, onChange }: EProps) {
  return (
    <>
      <TextField label="Utilisateur GitHub" value={config.username} onChange={(username) => onChange({ ...config, username })} autoCapitalize="none" />
      <NumberFieldRow label="Semaines (4–16)" value={config.weeks} onChange={(weeks) => onChange({ ...config, weeks })} />
    </>
  );
}

function CountdownEditor({ config, onChange }: EProps) {
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <TextField label="Emoji" value={config.emoji} onChange={(emoji) => onChange({ ...config, emoji })} />
      <TextField label="Date cible (ISO)" value={config.target} onChange={(target) => onChange({ ...config, target })} autoCapitalize="none" hint="Format : 2026-12-31T00:00:00.000Z" />
    </>
  );
}

function VisitorCounterEditor({ config, onChange }: EProps) {
  return (
    <>
      <NumberFieldRow label="Compteur" value={config.count} onChange={(count) => onChange({ ...config, count })} hint="En prod, il augmente automatiquement." />
      <TextField label="Libellé" value={config.label} onChange={(label) => onChange({ ...config, label })} />
    </>
  );
}

function FreeLinkEditor({ config, onChange }: EProps) {
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <TextField label="URL" value={config.url} onChange={(url) => onChange({ ...config, url })} keyboardType="url" autoCapitalize="none" />
      <TextField label="Description (optionnel)" value={config.description ?? ""} onChange={(description) => onChange({ ...config, description: description || undefined })} multiline />
      <TextField label="Image (URL, optionnel)" value={config.image ?? ""} onChange={(image) => onChange({ ...config, image: image || undefined })} keyboardType="url" autoCapitalize="none" />
      <TextField label="Emoji (optionnel)" value={config.emoji ?? ""} onChange={(emoji) => onChange({ ...config, emoji: emoji || undefined })} />
    </>
  );
}

function PollEditor({ config, onChange }: EProps) {
  return (
    <>
      <TextField label="Question" value={config.question} onChange={(question) => onChange({ ...config, question })} />
      <ListEditor
        label="Options"
        items={config.options ?? []}
        min={2}
        addLabel="Option"
        makeItem={() => ({ id: Math.random().toString(36).slice(2, 8), label: "Nouvelle option", votes: 0 })}
        onChange={(options) => onChange({ ...config, options })}
        renderItem={(item: any, update) => (
          <TextField label="Libellé" value={item.label} onChange={(label) => update({ label })} />
        )}
      />
    </>
  );
}

function WatchlistEditor({ config, onChange }: EProps) {
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <ListEditor
        label="Titres"
        items={config.items ?? []}
        addLabel="Titre"
        makeItem={() => ({ title: "Nouveau titre", status: "watching", poster: undefined as string | undefined })}
        onChange={(items) => onChange({ ...config, items })}
        renderItem={(item: any, update) => (
          <>
            <TextField label="Titre" value={item.title} onChange={(title) => update({ title })} />
            <SelectRow
              label="Statut"
              value={item.status}
              options={[
                { value: "watching", label: "En cours" },
                { value: "done", label: "Terminé" },
                { value: "plan", label: "Prévu" },
              ]}
              onChange={(status) => update({ status })}
            />
            <TextField label="Affiche (URL, optionnel)" value={item.poster ?? ""} onChange={(poster) => update({ poster: poster || undefined })} keyboardType="url" autoCapitalize="none" />
          </>
        )}
      />
    </>
  );
}

function PhotoEditor({ config, onChange }: EProps) {
  return (
    <ListEditor
      label="Images"
      items={config.images ?? []}
      addLabel="Image"
      makeItem={() => ({ src: "", alt: "" })}
      onChange={(images) => onChange({ ...config, images })}
      renderItem={(item: any, update) => (
        <>
          <PickImageButton onDone={(src) => update({ src })} />
          <TextField label="Source (URL)" value={item.src} onChange={(src) => update({ src })} keyboardType="url" autoCapitalize="none" hint="Importe depuis le téléphone, ou colle une URL." />
          <TextField label="Description (alt)" value={item.alt ?? ""} onChange={(alt) => update({ alt })} />
        </>
      )}
    />
  );
}

function YoutubeEmbedEditor({ config, onChange }: EProps) {
  return (
    <>
      <TextField label="URL de la vidéo" value={config.url} onChange={(url) => onChange({ ...config, url })} keyboardType="url" autoCapitalize="none" hint="youtube.com/watch?v=… ou youtu.be/…" />
      <TextField label="Titre (optionnel)" value={config.title ?? ""} onChange={(title) => onChange({ ...config, title: title || undefined })} />
    </>
  );
}

function TechStackEditor({ config, onChange }: EProps) {
  const t = useTheme();
  const items: string[] = config.items ?? [];
  const toggle = (key: string) => {
    const on = items.includes(key);
    onChange({ ...config, items: on ? items.filter((k) => k !== key) : [...items, key] });
  };
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <Field label="Technologies affichées">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {TECH_KEYS.map((key) => {
            const on = items.includes(key);
            return (
              <Pressable
                key={key}
                onPress={() => {
                  tap();
                  toggle(key);
                }}
                style={{ borderWidth: 1.5, borderColor: on ? t.accent : t.border, backgroundColor: on ? t.accent : "transparent", borderRadius: radius.pill, paddingVertical: 7, paddingHorizontal: 12 }}
              >
                <Text style={{ color: on ? t.onBrand : t.textMuted, fontWeight: "700", fontSize: 12 }}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      </Field>
    </>
  );
}

function PaypalEditor({ config, onChange }: EProps) {
  return (
    <>
      <TextField label="Identifiant paypal.me" value={config.handle} onChange={(handle) => onChange({ ...config, handle })} autoCapitalize="none" hint="La partie après paypal.me/" />
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <TextField label="Sous-titre" value={config.subtitle} onChange={(subtitle) => onChange({ ...config, subtitle })} />
    </>
  );
}

function LetterboxdEditor({ config, onChange }: EProps) {
  return (
    <TextField label="Utilisateur Letterboxd" value={config.username} onChange={(username) => onChange({ ...config, username })} autoCapitalize="none" hint="Le flux letterboxd.com/<pseudo>/rss/ alimente le widget." />
  );
}

function ToileEditor({ config, onChange }: EProps) {
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <TextField label="Sous-titre" value={config.subtitle} onChange={(subtitle) => onChange({ ...config, subtitle })} />
    </>
  );
}

function LolEditor({ config, onChange }: EProps) {
  const modeOptions = (Object.keys(LOL_MODE_LABELS) as (keyof typeof LOL_MODE_LABELS)[]).map((value) => ({
    value,
    label: LOL_MODE_LABELS[value],
  }));
  return (
    <>
      <TextField
        label="Riot ID"
        value={config.riotId}
        onChange={(riotId) => onChange({ ...config, riotId })}
        autoCapitalize="none"
        hint="Format pseudo#tag (compte EUW). Le PUUID est résolu côté serveur."
      />
      <SelectRow
        label="Affichage"
        value={config.mode}
        options={modeOptions}
        onChange={(mode) => onChange({ ...config, mode })}
      />
      <Text style={{ color: "#999", fontSize: 12 }}>Le mode ARAM arrive bientôt (donnée Riot non exploitable pour l'instant).</Text>
    </>
  );
}

export function TypeEditor({ type, config, onChange }: { type: WidgetType; config: any; onChange: (next: any) => void }) {
  switch (type) {
    case "social-link":
      return <SocialLinkEditor config={config} onChange={onChange} />;
    case "note":
      return <NoteEditor config={config} onChange={onChange} />;
    case "status":
      return <StatusEditor config={config} onChange={onChange} />;
    case "location-map":
      return <LocationOrWeatherEditor config={config} onChange={onChange} withZoom />;
    case "weather":
      return <LocationOrWeatherEditor config={config} onChange={onChange} />;
    case "guestbook":
      return <GuestbookEditor config={config} onChange={onChange} />;
    case "spotify-embed":
      return <SpotifyEmbedEditor config={config} onChange={onChange} />;
    case "spotify-now-playing":
      return <NowPlayingEditor config={config} onChange={onChange} />;
    case "github-stats":
      return <GithubStatsEditor config={config} onChange={onChange} />;
    case "countdown":
      return <CountdownEditor config={config} onChange={onChange} />;
    case "visitor-counter":
      return <VisitorCounterEditor config={config} onChange={onChange} />;
    case "free-link":
      return <FreeLinkEditor config={config} onChange={onChange} />;
    case "poll":
      return <PollEditor config={config} onChange={onChange} />;
    case "watchlist":
      return <WatchlistEditor config={config} onChange={onChange} />;
    case "photo":
      return <PhotoEditor config={config} onChange={onChange} />;
    case "video":
      return <VideoEditor config={config} onChange={onChange} />;
    case "youtube-embed":
      return <YoutubeEmbedEditor config={config} onChange={onChange} />;
    case "tech-stack":
      return <TechStackEditor config={config} onChange={onChange} />;
    case "paypal":
      return <PaypalEditor config={config} onChange={onChange} />;
    case "letterboxd":
      return <LetterboxdEditor config={config} onChange={onChange} />;
    case "toile":
      return <ToileEditor config={config} onChange={onChange} />;
    case "lol":
      return <LolEditor config={config} onChange={onChange} />;
    default:
      return null;
  }
}
