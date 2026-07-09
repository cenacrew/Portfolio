import type { WidgetType } from "@portfolio/shared";
import { SOCIAL_PLATFORMS } from "@portfolio/shared";
import { Pressable, Text, View } from "react-native";
import { radius, space, useTheme } from "../lib/theme";
import { Field, NumberFieldRow, SelectRow, TextField, ToggleRow, tap } from "./ui";

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

function SocialLinkEditor({ config, onChange }: EProps) {
  return (
    <>
      <SelectRow label="Plateforme" value={config.platform} options={opt(SOCIAL_PLATFORMS)} onChange={(platform) => onChange({ ...config, platform })} />
      <TextField label="URL" value={config.url} onChange={(url) => onChange({ ...config, url })} keyboardType="url" autoCapitalize="none" />
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
      <TextField label="Emoji" value={config.emoji} onChange={(emoji) => onChange({ ...config, emoji })} />
      <TextField label="Statut" value={config.text} onChange={(text) => onChange({ ...config, text })} multiline />
      <TextField label="Mention (optionnel)" value={config.updated ?? ""} onChange={(updated) => onChange({ ...config, updated: updated || undefined })} placeholder="Mis à jour aujourd'hui" />
    </>
  );
}

function LocationOrWeatherEditor({ config, onChange, withZoom }: EProps & { withZoom?: boolean }) {
  return (
    <>
      <TextField label="Ville" value={config.city} onChange={(city) => onChange({ ...config, city })} />
      <NumberFieldRow label="Latitude" value={config.lat} onChange={(lat) => onChange({ ...config, lat })} />
      <NumberFieldRow label="Longitude" value={config.lng} onChange={(lng) => onChange({ ...config, lng })} />
      {withZoom ? <NumberFieldRow label="Zoom (1–19)" value={config.zoom ?? 12} onChange={(zoom) => onChange({ ...config, zoom })} /> : null}
      {withZoom ? <TextField label="Légende (optionnel)" value={config.caption ?? ""} onChange={(caption) => onChange({ ...config, caption: caption || undefined })} /> : null}
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
          <TextField label="Source (URL)" value={item.src} onChange={(src) => update({ src })} keyboardType="url" autoCapitalize="none" hint="Astuce : utilise le raccourci « Poster une photo » du dashboard." />
          <TextField label="Description (alt)" value={item.alt ?? ""} onChange={(alt) => update({ alt })} />
        </>
      )}
    />
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
    default:
      return null;
  }
}
