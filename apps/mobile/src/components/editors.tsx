import type { WidgetType } from "@portfolio/shared";
import { COUNTDOWN_DEFAULT_END_MESSAGE, formatFileSize, GAME_KEYS, GAME_LABELS, LOL_MODE_LABELS, makeCvTimelineEntry, SOCIAL_PLATFORMS, TECH_KEYS } from "@portfolio/shared";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";
import { uploadFile, uploadImage, uploadVideo } from "../lib/actions";
import { radius, space, useTheme } from "../lib/theme";
import { EmojiPickerRow, Field, NumberFieldRow, SelectRow, SliderRow, TextField, ToggleRow, tap } from "./ui";

// Shared "import media" button behind the image / video / file pickers: one
// busy lifecycle and one byte-identical border/spinner style. `run` performs the
// pick + upload and flips `busy` on only once real work starts, so cancelling
// (or a denied permission) never flashes the spinner. The outer press handler
// always clears `busy` afterwards.
function PickButton({
  label,
  run,
}: {
  label: string;
  run: (setBusy: (b: boolean) => void) => Promise<void>;
}) {
  const t = useTheme();
  const [busy, setBusy] = useState(false);
  const onPress = async () => {
    try {
      await run(setBusy);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: t.accent, borderRadius: radius.sm, paddingVertical: 12 }}
    >
      {busy ? <ActivityIndicator color={t.accent} /> : <Text style={{ color: t.accent, fontWeight: "800" }}>{label}</Text>}
    </Pressable>
  );
}

// Pick an image from the library and upload it to widget-media, returning the
// public URL through onDone. Used by the photo editor now that the top-bar
// "post a photo" shortcut is gone (tap a tile to manage its media).
function PickImageButton({ onDone }: { onDone: (url: string) => void }) {
  return (
    <PickButton
      label="📷 Importer une image"
      run={async (setBusy) => {
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
        }
      }}
    />
  );
}

// Pick a video from the library and upload it. ~50 Mo limit enforced in uploadVideo.
function PickVideoButton({ onDone }: { onDone: (url: string) => void }) {
  return (
    <PickButton
      label="🎞️ Importer une vidéo"
      run={async (setBusy) => {
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
        }
      }}
    />
  );
}

// Pick any document from the device and upload it to widget-media (files/).
// expo-document-picker works in Expo Go. The ~50 MB cap is enforced in
// uploadFile; here we just surface a clear error if the read/upload fails.
function PickFileButton({
  onDone,
}: {
  onDone: (file: { fileUrl: string; fileName: string; sizeBytes: number; mimeType: string }) => void;
}) {
  return (
    <PickButton
      label="📎 Importer un fichier"
      run={async (setBusy) => {
        const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true, multiple: false });
        if (res.canceled || !res.assets?.[0]?.uri) return;
        const asset = res.assets[0];
        setBusy(true);
        try {
          const mime = asset.mimeType ?? "application/octet-stream";
          const name = asset.name ?? "fichier";
          const { url, sizeBytes } = await uploadFile(asset.uri, name, mime);
          onDone({ fileUrl: url, fileName: name, sizeBytes, mimeType: mime });
          tap();
        } catch (e) {
          Alert.alert("Échec de l'import", e instanceof Error ? e.message : "Réessaie.");
        }
      }}
    />
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
  // Weather (no zoom): follows the admin presence by default (phase 4.10 A7),
  // fixed city fields shown only when that's turned off.
  const follows = !withZoom && config.followPresence !== false;
  return (
    <>
      {withZoom ? (
        <ToggleRow
          label="Utiliser « Ma loc »"
          value={maLoc}
          onChange={(on) => onChange({ ...config, mode: on ? "ma-loc" : "fixed" })}
          hint="La carte se cale sur la position de ce téléphone à chaque ouverture de l'app (autorisation requise)."
        />
      ) : (
        <ToggleRow
          label="Suivre ma présence"
          value={follows}
          onChange={(on) => onChange({ ...config, followPresence: on })}
          hint="La météo suit la localisation de l'app (comme « Ma loc »). Désactive pour une ville fixe."
        />
      )}
      {!follows ? (
        <>
      <TextField label="Ville" value={config.city} onChange={(city) => onChange({ ...config, city })} />
      <NumberFieldRow label="Latitude" value={config.lat} onChange={(lat) => onChange({ ...config, lat })} />
      <NumberFieldRow label="Longitude" value={config.lng} onChange={(lng) => onChange({ ...config, lng })} />
        </>
      ) : null}
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
      <ToggleRow
        label="Son au clic"
        value={config.tapToUnmute ?? false}
        onChange={(tapToUnmute) => onChange({ ...config, tapToUnmute })}
        hint="La vidéo reste muette en boucle ; un tap active ou coupe le son."
      />
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

// Native date+time picker (phase 4.10 B5): friendlier than typing an ISO
// string. On Android it opens the date dialog, then the time dialog, and writes
// the chosen moment back as an ISO string.
function DateTimeField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const t = useTheme();
  const parsed = value ? new Date(value) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const [step, setStep] = useState<null | "date" | "time">(null);
  const [temp, setTemp] = useState<Date>(date);

  const open = () => {
    setTemp(date);
    setStep("date");
  };

  const onPick = (event: { type?: string }, selected?: Date) => {
    if (event?.type === "dismissed" || !selected) {
      setStep(null);
      return;
    }
    if (step === "date") {
      const d = new Date(temp);
      d.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setTemp(d);
      setStep("time");
    } else {
      const d = new Date(temp);
      d.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setStep(null);
      onChange(d.toISOString());
    }
  };

  return (
    <Field label="Date cible">
      <Pressable
        onPress={open}
        style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.sm, paddingVertical: 12, paddingHorizontal: 14 }}
      >
        <Text style={{ color: t.text, fontSize: 15, fontWeight: "600" }}>
          {date.toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </Text>
      </Pressable>
      {step ? <DateTimePicker value={temp} mode={step} onChange={onPick} /> : null}
    </Field>
  );
}

function CountdownEditor({ config, onChange }: EProps) {
  const t2 = useTheme();
  const behavior = config.endBehavior ?? "message";
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <TextField label="Emoji" value={config.emoji} onChange={(emoji) => onChange({ ...config, emoji })} />
      <DateTimeField value={config.target} onChange={(target) => onChange({ ...config, target })} />
      <SelectRow
        label="À l'échéance"
        value={behavior}
        options={[
          { value: "message", label: "Message de fin" },
          { value: "elapsed", label: "Compteur « depuis »" },
          { value: "hide", label: "Masquer la tuile" },
        ]}
        onChange={(endBehavior) => onChange({ ...config, endBehavior })}
        hint="Ce qui s'affiche une fois la date atteinte."
      />
      {behavior === "message" ? (
        <TextField
          label="Message de fin"
          value={config.endMessage ?? ""}
          onChange={(endMessage) => onChange({ ...config, endMessage })}
          placeholder={COUNTDOWN_DEFAULT_END_MESSAGE}
        />
      ) : null}
      {behavior === "hide" ? (
        <Text style={{ color: t2.textFaint, fontSize: 12 }}>
          La tuile disparaît du dashboard public une fois la date atteinte, mais reste ici pour l'éditer.
        </Text>
      ) : null}
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
    <>
      <ListEditor
        label="Images"
        items={config.images ?? []}
        addLabel="Image"
        makeItem={() => ({ src: "", alt: "", caption: undefined as string | undefined, linkUrl: undefined as string | undefined })}
        onChange={(images) => onChange({ ...config, images })}
        renderItem={(item: any, update) => (
          <>
            <PickImageButton onDone={(src) => update({ src })} />
            <TextField label="Source (URL)" value={item.src} onChange={(src) => update({ src })} keyboardType="url" autoCapitalize="none" hint="Importe depuis le téléphone, ou colle une URL." />
            {/* Phase 4.10 B4: the description is the caption shown on the tile
                (like videos). Mirror it into `alt` for accessibility. */}
            <TextField
              label="Description (légende affichée)"
              value={item.caption ?? ""}
              onChange={(caption) => update({ caption: caption || undefined, alt: caption })}
            />
            <TextField
              label="Lien au clic (optionnel)"
              value={item.linkUrl ?? ""}
              onChange={(linkUrl) => update({ linkUrl: linkUrl || undefined })}
              keyboardType="url"
              autoCapitalize="none"
              hint="Un tap sur l'image ouvre ce lien."
            />
          </>
        )}
      />
      {/* Phase 6: configurable carousel delay. 0 = no auto-advance. */}
      <NumberFieldRow
        label="Défilement auto (secondes)"
        value={config.intervalSec ?? 5}
        onChange={(intervalSec) => onChange({ ...config, intervalSec })}
        hint="Délai entre deux photos. 0 = pas de défilement automatique (navigation par les boutons)."
      />
    </>
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

function FileDownloadEditor({ config, onChange }: EProps) {
  const t = useTheme();
  const size = formatFileSize(config.sizeBytes ?? 0);
  return (
    <>
      <PickFileButton
        onDone={({ fileUrl, fileName, sizeBytes, mimeType }) => onChange({ ...config, fileUrl, fileName, sizeBytes, mimeType })}
      />
      {config.fileUrl ? (
        <Text style={{ color: t.textMuted, fontSize: 12 }} numberOfLines={2}>
          Fichier : {config.fileName || config.fileUrl}
          {size ? ` · ${size}` : ""}
        </Text>
      ) : (
        <Text style={{ color: t.textFaint, fontSize: 12 }}>Aucun fichier. Tout type accepté, 50 Mo max.</Text>
      )}
      <TextField
        label="Titre affiché (optionnel)"
        value={config.label ?? ""}
        onChange={(label) => onChange({ ...config, label: label || undefined })}
        hint="Par défaut, le nom du fichier est affiché."
      />
      <TextField
        label="Description (optionnel)"
        value={config.description ?? ""}
        onChange={(description) => onChange({ ...config, description: description || undefined })}
        multiline
      />
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
    </>
  );
}

function ContactCardEditor({ config, onChange }: EProps) {
  return (
    <>
      <TextField label="Prénom" value={config.firstName} onChange={(firstName) => onChange({ ...config, firstName })} />
      <TextField label="Nom" value={config.lastName} onChange={(lastName) => onChange({ ...config, lastName })} />
      <TextField label="Rôle (optionnel)" value={config.role ?? ""} onChange={(role) => onChange({ ...config, role: role || undefined })} placeholder="Développeur produit" />
      <TextField label="Organisation (optionnel)" value={config.org ?? ""} onChange={(org) => onChange({ ...config, org: org || undefined })} />
      <TextField label="Téléphone (optionnel)" value={config.phone ?? ""} onChange={(phone) => onChange({ ...config, phone: phone || undefined })} autoCapitalize="none" placeholder="+33 6…" />
      <TextField label="Email (optionnel)" value={config.email ?? ""} onChange={(email) => onChange({ ...config, email: email || undefined })} keyboardType="email-address" autoCapitalize="none" />
      <TextField label="Site web (optionnel)" value={config.website ?? ""} onChange={(website) => onChange({ ...config, website: website || undefined })} keyboardType="url" autoCapitalize="none" />
      <ToggleRow
        label="Utiliser l'avatar de l'en-tête"
        value={config.useHeaderAvatar}
        onChange={(useHeaderAvatar) => onChange({ ...config, useHeaderAvatar })}
        hint="La photo de la carte (et de la vCard) reprend l'avatar du dashboard."
      />
      {!config.useHeaderAvatar ? (
        <TextField label="Photo (URL)" value={config.photoUrl ?? ""} onChange={(photoUrl) => onChange({ ...config, photoUrl: photoUrl || undefined })} keyboardType="url" autoCapitalize="none" />
      ) : null}
    </>
  );
}

// CV timeline editor: add / remove / REORDER entries (▲▼ per row — the plan
// requires ordering control, which the generic ListEditor doesn't offer).
function CvTimelineEditor({ config, onChange }: EProps) {
  const t = useTheme();
  const entries: any[] = config.entries ?? [];
  const setEntries = (next: any[]) => onChange({ ...config, entries: next });
  const update = (i: number, patch: Record<string, unknown>) =>
    setEntries(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const remove = (i: number) => setEntries(entries.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= entries.length) return;
    const next = [...entries];
    [next[i], next[j]] = [next[j], next[i]];
    setEntries(next);
  };
  const arrow = (i: number, dir: -1 | 1, glyph: string) => {
    const disabled = dir === -1 ? i === 0 : i === entries.length - 1;
    return (
      <Pressable
        onPress={() => {
          tap();
          move(i, dir);
        }}
        disabled={disabled}
        hitSlop={6}
        style={{ width: 30, height: 30, borderWidth: 1, borderColor: t.border, borderRadius: 8, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.35 : 1 }}
      >
        <Text style={{ color: t.textMuted, fontWeight: "800", fontSize: 13 }}>{glyph}</Text>
      </Pressable>
    );
  };
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <Field label="Entrées (de la plus récente à la plus ancienne)">
        <View style={{ gap: space.sm }}>
          {entries.map((item, i) => (
            <View key={item.id ?? i} style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.sm, padding: 12, gap: 8 }}>
              <TextField label="Période" value={item.period} onChange={(period) => update(i, { period })} placeholder="2023 — aujourd'hui" />
              <TextField label="Intitulé" value={item.title} onChange={(title) => update(i, { title })} placeholder="Développeur produit" />
              <TextField label="Lieu" value={item.place} onChange={(place) => update(i, { place })} placeholder="Entreprise / ville" />
              <TextField label="Logo (URL, optionnel)" value={item.logoUrl ?? ""} onChange={(logoUrl) => update(i, { logoUrl: logoUrl || undefined })} keyboardType="url" autoCapitalize="none" />
              <TextField label="Description (optionnel)" value={item.description ?? ""} onChange={(description) => update(i, { description: description || undefined })} multiline />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {arrow(i, -1, "▲")}
                {arrow(i, 1, "▼")}
                <Pressable
                  onPress={() => {
                    tap();
                    remove(i);
                  }}
                  style={{ marginLeft: "auto" }}
                >
                  <Text style={{ color: t.danger, fontWeight: "700", fontSize: 13 }}>Retirer</Text>
                </Pressable>
              </View>
            </View>
          ))}
          <Pressable
            onPress={() => {
              tap();
              setEntries([...entries, makeCvTimelineEntry()]);
            }}
            style={{ borderWidth: 1.5, borderColor: t.border, borderStyle: "dashed", borderRadius: radius.sm, padding: 12, alignItems: "center" }}
          >
            <Text style={{ color: t.textMuted, fontWeight: "700" }}>+ Entrée</Text>
          </Pressable>
        </View>
      </Field>
    </>
  );
}

function ReactionsEditor({ config, onChange }: EProps) {
  const t = useTheme();
  const emojis: string[] = config.emojis ?? [];
  const setAt = (i: number, value: string) => onChange({ ...config, emojis: emojis.map((e, idx) => (idx === i ? value : e)) });
  const removeAt = (i: number) => onChange({ ...config, emojis: emojis.filter((_, idx) => idx !== i) });
  const add = () => onChange({ ...config, emojis: [...emojis, "✨"] });
  return (
    <>
      <TextField label="Titre" value={config.title} onChange={(title) => onChange({ ...config, title })} />
      <Field label="Emojis proposés (1 à 8)">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {emojis.map((emoji, i) => (
            <View key={i} style={{ borderWidth: 1, borderColor: t.border, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <TextInput
                value={emoji}
                onChangeText={(v) => setAt(i, v)}
                maxLength={8}
                style={{ minWidth: 34, textAlign: "center", fontSize: 20, color: t.text, paddingVertical: 2 }}
              />
              <Pressable
                onPress={() => {
                  tap();
                  removeAt(i);
                }}
                disabled={emojis.length <= 1}
                hitSlop={8}
                style={{ opacity: emojis.length <= 1 ? 0.35 : 1 }}
              >
                <Text style={{ color: t.danger, fontWeight: "800", fontSize: 13 }}>✕</Text>
              </Pressable>
            </View>
          ))}
          {emojis.length < 8 ? (
            <Pressable
              onPress={() => {
                tap();
                add();
              }}
              style={{ width: 44, height: 44, borderWidth: 1.5, borderColor: t.border, borderStyle: "dashed", borderRadius: radius.sm, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: t.textMuted, fontSize: 22, fontWeight: "700" }}>+</Text>
            </Pressable>
          ) : null}
        </View>
      </Field>
    </>
  );
}

function MiniGameEditor({ config, onChange }: EProps) {
  return (
    <>
      <SelectRow
        label="Jeu"
        value={config.game}
        options={GAME_KEYS.map((g) => ({ value: g, label: GAME_LABELS[g] }))}
        onChange={(game) => onChange({ ...config, game })}
      />
      <TextField
        label="Titre (optionnel)"
        value={config.title ?? ""}
        onChange={(title) => onChange({ ...config, title: title || undefined })}
        hint="Par défaut, le nom du jeu est affiché. Joue au jeu réel via l'aperçu du dashboard."
      />
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
    case "file-download":
      return <FileDownloadEditor config={config} onChange={onChange} />;
    case "contact-card":
      return <ContactCardEditor config={config} onChange={onChange} />;
    case "cv-timeline":
      return <CvTimelineEditor config={config} onChange={onChange} />;
    case "reactions":
      return <ReactionsEditor config={config} onChange={onChange} />;
    case "mini-game":
      return <MiniGameEditor config={config} onChange={onChange} />;
    default:
      return null;
  }
}
