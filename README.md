# cenacrew.com — portfolio + multi-zone hub

Personal portfolio of Valentin Sourdois Pajot, and the **hub** for
`cenacrew.com`. The home page (`/`) is the portfolio; every project lives on its
own `cenacrew.com/<project>` path, served by its own repo and Vercel project
through **Next.js multi-zone rewrites**. The visitor only ever sees
`cenacrew.com/...` — the hub proxies the rest.

Site content is in French; code, identifiers and commits are in English.

> The public URL `cenacrew.com/qrcode` must stay up permanently — printed QR
> codes point at it. It is served by the **cenacrew/MosaLink** zone through the
> rewrites below; never break those paths.

## Stack

- **Web** (`apps/web`): Next.js 16 (App Router, React 19, TypeScript), deployed
  on Vercel (root directory `apps/web`, domain `cenacrew.com`). Hosts the
  portfolio (`/`, `/files/*`, `404`) and the multi-zone rewrites. The hub has
  **no API routes and no env vars of its own**.
- **Analytics**: `@vercel/analytics` + `@vercel/speed-insights` (hub-scoped;
  each zone ships its own).

## Zones served by the hub

Defined in `apps/web/next.config.ts`. All of these paths are proxied to
`mosalink.cenacrew.com` (technical sub-domain, never advertised, `noindex`):

| Public path | Zone | Repo |
|---|---|---|
| `/qrcode`, `/qrcode/:path*` | MosaLink dashboard | `cenacrew/MosaLink` |
| `/adminqrcode`, `/adminqrcode/:path*` | MosaLink admin | `cenacrew/MosaLink` |
| `/api/:path*` | MosaLink API routes | `cenacrew/MosaLink` |
| `/mosalink-zone/:path*` | MosaLink `_next` assets (assetPrefix) | `cenacrew/MosaLink` |
| `/qa-gallery` | MosaLink QA gallery | `cenacrew/MosaLink` |

`robots.ts` keeps `/adminqrcode` out of search engines on the public domain.

## Monorepo layout

```
/
├─ apps/
│  └─ web/        # Next.js 16 — portfolio + multi-zone rewrites
├─ pnpm-workspace.yaml
└─ README.md
```

Kept as a minimal pnpm workspace (single `apps/*` package) so the Vercel Root
Directory stays `apps/web` and future zone-less sub-apps can slot in without
reworking the root scripts.

## Development

Requires Node 24 and pnpm (via corepack).

```bash
pnpm install          # from the repo root
pnpm dev              # apps/web in dev at http://localhost:3000
pnpm build            # production build of apps/web
pnpm start            # serve the production build
pnpm lint             # lint apps/web
```

The hub runs **without any env vars**. In local dev the proxied paths
(`/qrcode`, `/api/*`, …) only work when the MosaLink zone is reachable; the
portfolio (`/`) works standalone.

### Deployment

Vercel project `portfolio`, **Root Directory `apps/web`**, framework Next.js
auto-detected, domain `cenacrew.com`. No custom env vars.

## Adding a new project at `cenacrew.com/<project>`

1. Create a **new repo** and a **new Vercel project** for it (its own
   `apps/web`, Root Directory `apps/web`).
2. Give the Vercel project a **technical sub-domain** `<project>.cenacrew.com`
   (the multi-zone target). Never advertise it.
3. In the zone's `next.config.ts`, set an `assetPrefix` (e.g.
   `/<project>-zone`) with the matching internal `_next` rewrite, so its assets
   don't collide with the hub's through the proxy.
4. In the **hub's** `apps/web/next.config.ts`, add a rewrite block sending every
   public path of the project to `https://<project>.cenacrew.com/<same path>`
   (page path, `/api` if it has one, the `<project>-zone` asset path, …).
   Rewrites run after the local filesystem, so the portfolio always wins;
   only paths that don't exist on the hub fall through to the zone.
5. On the **zone**, block indexing of the technical sub-domain with
   `robots.txt` `Disallow: /` (served on `<project>.cenacrew.com`). **Never**
   use a `noindex` response header on the zone: Vercel's edge normalises
   `Host` / `x-forwarded-host`, so the header would leak onto the public
   `cenacrew.com/<project>` URL and de-index it. Canonical/OG stay on
   `cenacrew.com` via `metadataBase`.

`/qrcode` is the first project built on this pattern; it is served by
`cenacrew/MosaLink`.
