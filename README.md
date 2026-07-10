# Portfolio + Dashboard bento — cenacrew.com

Personal portfolio of Valentin Sourdois Pajot and a public bento dashboard
behind the printed QR codes at **cenacrew.com/qrcode**, plus the Android admin
app that drives it. Site content is in French; code, identifiers and commits are
in English.

> The public URL `cenacrew.com/qrcode` must stay up permanently — printed QR
> codes point at it.

## Stack

- **Web** (`apps/web`): Next.js 16 (App Router, React 19, TypeScript), deployed
  on Vercel (root directory `apps/web`, domain `cenacrew.com`). Hosts the
  portfolio (`/`), the public dashboard (`/qrcode`), the admin (`/adminqrcode`)
  and the API routes.
- **Mobile** (`apps/mobile`): Expo SDK 57 / React Native admin app "QRCodeAdmin"
  (expo-router, TypeScript). Dev via Expo Go; standalone APK via EAS (preview
  profile). See `apps/mobile/README.md`.
- **Shared** (`packages/shared`): widget model, Zod config schemas, grid
  constants and the typed Supabase client/queries — one source of truth for web
  and mobile, no duplicated business logic.
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime). Schema, RLS and
  seed live in `supabase/migrations` (`0001` → `0006`); read-only RLS checks in
  `supabase/checks/rls_audit.sql`.
- **No-key APIs**: Open-Meteo (weather), Leaflet + OpenStreetMap (maps),
  Letterboxd RSS. Spotify and Riot (LoL) use server-only credentials.

## Monorepo layout

```
/
├─ apps/
│  ├─ web/         # Next.js 16 — portfolio + /qrcode + /adminqrcode + API routes
│  └─ mobile/      # Expo / React Native admin app (QRCodeAdmin)
├─ packages/
│  └─ shared/      # widget types, Zod schemas, grid constants, Supabase client
├─ supabase/
│  ├─ migrations/  # 0001…0006 (schema, RLS, storage, seed, settings, presence)
│  └─ checks/      # rls_audit.sql (read-only verification)
├─ scripts/        # one-off maintenance (layout remap, overlap repair)
├─ pnpm-workspace.yaml
└─ PLAN.md         # phased migration plan
```

## Development

Requires Node 24 and pnpm (via corepack).

```bash
pnpm install          # from the repo root — installs the whole workspace
pnpm dev              # apps/web in dev at http://localhost:3000
pnpm build            # production build of apps/web
pnpm start            # serve the production build
pnpm lint             # lint apps/web
```

The web app runs **without any env vars**: `/qrcode` falls back to the local
config in `apps/web/src/config/widgets.config.ts` and `/adminqrcode` shows a
"not configured" screen. Fill `apps/web/.env.local` (see `apps/web/.env.example`)
to enable the database, admin editing, live guestbook/poll/visits, Spotify and
the LoL widget.

Mobile app: see `apps/mobile/README.md` (Expo Go dev + EAS preview APK build).

## Environment variables

- `apps/web/.env.example` — Supabase (public URL + anon key, server-only
  service_role), poll hash salt, Spotify, Riot.
- `apps/mobile/.env.example` — public Supabase URL + anon key only. The
  service_role key never ships in the app; all mobile writes go through the
  authenticated Supabase session, enforced by RLS.
