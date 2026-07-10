# QRCodeAdmin — mobile admin (Expo / React Native)

Admin app for the `cenacrew.com/qrcode` bento dashboard. Manage widgets, quick
status, photos and guestbook moderation from Android. Dev runs through **Expo
Go** (no native build — that's phase 5 / EAS).

- Expo SDK 57, expo-router, TypeScript.
- Reuses `@portfolio/shared` for the widget model, Zod config schemas and the
  Supabase queries — no business logic is duplicated.
- All writes go through the authenticated Supabase session and are enforced by
  RLS. Only the public anon key ships in the app; the service_role key never does.

## Setup

1. Install deps from the **repo root** (pnpm workspace):
   ```bash
   pnpm install
   ```
2. Create `apps/mobile/.env` from the example and fill in the public Supabase
   values (same project as the web app):
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   ```
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```

## Run (Expo Go)

```bash
pnpm --filter mobile start
```

Scan the printed QR code with the **Expo Go** app on your Android phone (phone
and computer on the same network). The app hot-reloads on save.

Useful checks:
```bash
pnpm --filter mobile exec tsc --noEmit          # typecheck
cd apps/mobile && npx expo export --platform android   # JS bundle compiles
```

## Build a standalone APK (EAS preview)

Goal: a real `.apk` installed on the phone that runs without Expo Go or a PC.
Config lives in `eas.json` (profile `preview` → internal distribution, Android
`buildType: apk`) and `app.json` (`android.package = com.cenacrew.qrcodeadmin`,
`versionCode`). The build runs on Expo's free tier.

### 1. One-time setup
```bash
npm install -g eas-cli          # or: pnpm add -g eas-cli
eas login                        # your Expo account
cd apps/mobile
eas init                         # links the project, writes the EAS projectId
```

### 2. Embed the public env vars (EXPO_PUBLIC_*)
The local `apps/mobile/.env` is **not** uploaded to the EAS build servers
(it's gitignored). For an `EXPO_PUBLIC_*` value to be inlined into the bundle at
build time, register it as an **EAS environment variable** in the `preview`
environment (both values are the public anon credentials — safe to store there):

```bash
cd apps/mobile
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL      --value "https://<project>.supabase.co" --visibility plaintext
eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "sb_publishable_..."                --visibility plaintext
```

The `preview` build profile declares `"environment": "preview"`, so EAS injects
these before Metro bundles — `process.env.EXPO_PUBLIC_SUPABASE_URL` etc. are
then baked into the APK. (Alternative: hardcode them under `build.preview.env`
in `eas.json`; not done here to avoid committing the URL/key.)

### 3. Build the APK
```bash
cd apps/mobile
eas build --profile preview --platform android
```

EAS returns a build URL; when it finishes, download the `.apk` (or scan the
QR code EAS prints) and install it on the phone (allow "install from unknown
sources"). No Expo Go, no PC needed afterwards.

## pnpm monorepo + Metro (the classic friction point)

pnpm installs dependencies as symlinks into an isolated store
(`node_modules/.pnpm`), which Metro doesn't resolve out of the box. Handled in
`metro.config.js`:

- `watchFolders = [workspaceRoot]` so edits in `packages/shared` trigger reloads.
- `resolver.nodeModulesPaths = [app/node_modules, workspaceRoot/node_modules]`
  so both the app's and the root's dependencies resolve.
- `resolver.disableHierarchicalLookup = false` so pnpm's symlinked transitive
  deps resolve through the store (Metro follows symlinks by default here).

We deliberately keep pnpm's default (isolated) node-linker rather than switching
to `hoisted`: web (React 19.2.4) and mobile (React 19.2.3) each keep their own
React copy, which a hoisted layout would collide.

## Where things live

```
src/
  app/                     # expo-router routes
    _layout.tsx            # providers + Stack, theme-aware status bar
    index.tsx              # auto-login gate → login or dashboard
    login.tsx              # Supabase email/password, persisted session
    (admin)/
      _layout.tsx          # session guard
      dashboard.tsx        # 2D drag board (mobile/desktop) + quick status + Realtime
      new.tsx              # add-widget gallery
      widget/[id].tsx      # per-type edit form + size (for the toggled breakpoint)
      guestbook.tsx        # guestbook moderation (list + delete)
  components/
    ui.tsx                 # design system (navy + cream, dark mode) + slider
    WidgetPreview.tsx      # simplified per-type tile previews
    DragGrid.tsx           # to-scale 2D drag board with live collision push
    editors.tsx            # per-type RN edit forms
  lib/
    supabase.ts            # anon client, AsyncStorage session persistence
    auth.tsx               # AuthProvider (auto-login, AppState refresh)
    registry.ts            # mobile widget registry (shared schemas + sizes)
    widgets.ts             # widget list hook + Realtime
    actions.ts             # writes (config, layout, visibility, photo upload)
    theme.ts               # design tokens
```
