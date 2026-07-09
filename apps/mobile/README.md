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
      dashboard.tsx        # bento preview + quick actions + Realtime
      reorder.tsx          # order / size-per-breakpoint / visibility
      new.tsx              # add-widget gallery
      widget/[id].tsx      # per-type edit form (validated by shared Zod)
      guestbook.tsx        # guestbook moderation (list + delete)
  components/
    ui.tsx                 # design system (navy + cream, dark mode)
    WidgetPreview.tsx      # simplified per-type tile previews
    editors.tsx            # per-type RN edit forms
  lib/
    supabase.ts            # anon client, AsyncStorage session persistence
    auth.tsx               # AuthProvider (auto-login, AppState refresh)
    registry.ts            # mobile widget registry (shared schemas + sizes)
    widgets.ts             # widget list hook + Realtime
    actions.ts             # writes (config, layout, visibility, photo upload)
    theme.ts               # design tokens
```
