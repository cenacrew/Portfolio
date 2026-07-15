# PLAN 2 — Évolutions dashboard QR Code (source : `evovl.md`)

> Document d'exécution destiné à Opus. Fable sert d'orchestrateur/advisor.
> Langue du projet : français (UI et contenu). Code, identifiants et commits en anglais.
> **Règle absolue : l'URL publique `cenacrew.com/qrcode` doit fonctionner en permanence** (des QR codes imprimés pointent dessus). Aucune phase ne doit la casser, même temporairement en prod.
> **Design : charger le skill `frontend-design` avant toute création/refonte d'UI.** Mobile d'abord (le dashboard est surtout ouvert via scan de QR code).
> Contraintes inchangées : compatible **Expo Go** côté app ; coût total **0 €** ; pas d'attribution IA dans les commits.

## Vue d'ensemble

| Phase | Livrable | Dépend de |
|-------|----------|-----------|
| 6 | Quick wins : bouton « Sauvegarder » flottant (app), délai carrousel configurable, Vercel Analytics + Speed Insights | — |
| 7 | Widget `file-download` + hygiène Storage (suppression média à la racine + script de purge des orphelins) | — |
| 8 | Versions multiples du dashboard via URL (`/qrcode/[slug]`, ex. version « travail » orientée CV) | 7 (règles de suppression média cross-références) |
| 9 | Workflow QA « test widgets » (détection auto « à vérifier », interface de test, validation, screenshots, issues GitHub) | — (mais à faire en dernier : il auditera tout le reste) |

## Décisions d'architecture (validées avec l'utilisateur)

- **Versions du dashboard = versions indépendantes** : table `dashboards` (slug) ; chaque widget appartient à UNE version avec ses propres layouts ; l'en-tête (`site_settings`) est aussi par version ; outil « dupliquer » pour démarrer une nouvelle version depuis la version par défaut. Gestion depuis **l'app mobile ET l'admin web**.
- **QA détection = hash auto du code + forçage manuel** : hash par dossier de type de widget calculé au build, comparé au hash validé en base ; bouton « re-vérifier » manuel dans l'interface.
- **QA interface = web (`/adminqrcode/test`) + accès WebView depuis l'app** (le rendu à auditer est le rendu web public, donc la page de test est web).
- **QA restitution = table Supabase + issue GitHub** (API GitHub, token serveur en env var, jamais côté client) avec note humaine + screenshot uploadé dans le bucket.
- **Widget fichier : tout type, 50 Mo max** (le bucket free tier fait 1 Go au total).
- **Bucket : correction à la racine + purge one-off** (pas seulement un nettoyage ponctuel).
- **Analytics : `@vercel/analytics` + `@vercel/speed-insights`**, tout le site.
- Décisions par défaut de l'orchestrateur (ajustables si l'utilisateur le demande) : compteur de visites **global** (incrémenté quelle que soit la version) ; slug de version inconnu → **404** ; les **archives de la toile** dans le bucket sont exclues de la purge (elles sont intentionnelles).

---

## Phase 6 — Quick wins

1. **Bouton « Sauvegarder » flottant (app mobile admin)** : aujourd'hui il apparaît sous la grille et force un scroll. Il devient un bouton flottant en `position: absolute`, calé en bas au **centre**, entre le FAB « Rendu réel » (bas gauche) et le FAB « + » (bas droite), visible uniquement quand des modifications de layout sont en attente. Même langage visuel que les deux FABs existants.
2. **Délai du carrousel photo configurable (admin)** : le schéma du widget `photo` (dans `packages/shared`) gagne un champ `intervalSec` (défaut : 5, la valeur actuelle). L'éditeur mobile expose le réglage (et l'Editor web s'il existe pour ce widget). **`0` = aucun défilement automatique**, navigation uniquement par les boutons. Le comportement existant « un changement manuel réinitialise le compteur » est conservé. Les widgets existants sans le champ tombent sur 5 s (défaut Zod, pas de migration de données nécessaire).
3. **Vercel Analytics + Speed Insights** : ajouter `@vercel/analytics` et `@vercel/speed-insights` dans le layout racine de `apps/web` (composants `<Analytics />` / `<SpeedInsights />`). Couvre portfolio + `/qrcode` + versions futures. Aucune env var requise ; l'activation dashboard Vercel est faite par l'utilisateur.

**Critères d'acceptation** : le bouton Sauvegarder est atteignable sans scroller quelle que soit la hauteur de la grille et n'occulte pas les deux FABs ; un carrousel réglé à 0 ne défile jamais tout seul ; les événements analytics remontent dans le dashboard Vercel (vérifier après déploiement).

---

## Phase 7 — Widget `file-download` + hygiène Storage

### A. Nouveau widget `file-download`

1. Dossier autonome `apps/web/src/widgets/file-download/` (schema + Renderer + Editor) + ligne dans `registry.ts` + miroir mobile dans `apps/mobile/src/lib/registry.ts`. Schéma partagé dans `packages/shared`.
2. Config : `{ fileUrl, fileName, sizeBytes, mimeType, label?, description? }`. Upload depuis l'éditeur mobile via `expo-document-picker` (compatible Expo Go) vers le bucket `widget-media` (préfixe `files/`), **tout type accepté, 50 Mo max** (garde-fou côté app ET côté API d'upload serveur). Réutiliser la lecture `expo-file-system` fiabilisée en 4.6 (pas de `fetch(uri)`).
3. Rendu public : icône selon l'extension (SVG locaux : PDF, ZIP, image, audio, vidéo, APK, générique…), nom du fichier, taille lisible (Ko/Mo), label optionnel. Clic = téléchargement (lien direct vers l'URL publique Storage, attribut `download`). Rendu propre dans **tous les formats** (1x1 = icône + emoji ⬇ compact, grands formats = icône + nom + taille + description).

### B. Hygiène Storage (cause racine + purge)

4. **Suppression à la racine** : quand un widget référençant un média (photo, video, file-download, toile) est **supprimé**, ou quand son média est **remplacé** dans l'éditeur, le(s) fichier(s) Storage correspondants sont supprimés dans la foulée — côté app mobile et côté admin web (mutualiser dans `packages/shared` une fonction `deleteWidgetMedia(widget)` / `extractMediaPaths(widget)`). **Garde-fou cross-références** : ne supprimer un fichier que s'il n'est référencé par aucun autre widget (important dès la phase 8 : la duplication de version partage les médias).
5. **Script de purge one-off** `scripts/purge-orphan-media.ts` : liste tous les objets du bucket, collecte toutes les URLs référencées (configs de TOUS les widgets toutes versions confondues + `site_settings` + futurs screenshots QA), **exclut les archives de la toile**, affiche un rapport dry-run (fichiers, tailles, total récupéré) et ne supprime qu'avec `--apply`. Exécuté par l'orchestrateur après merge (dry-run montré à l'utilisateur avant `--apply`).

**Critères d'acceptation** : un fichier de 40 Mo uploadé depuis l'app se télécharge depuis `/qrcode` sur mobile et desktop ; un fichier de 60 Mo est refusé avec un message clair ; supprimer un widget photo fait disparaître ses images du bucket ; le dry-run du script liste des orphelins plausibles et `--apply` les supprime sans toucher aux médias référencés ni aux archives toile.

---

## Phase 8 — Versions multiples du dashboard (`/qrcode/[slug]`)

**Modèle** : versions indépendantes. Migration SQL `0007` (idempotente, comme les précédentes) :

- Table `dashboards` : `id uuid pk, slug text unique, name text, is_default bool, created_at` — RLS lecture publique, écriture authentifiée. Seed : une ligne `is_default = true` (slug `default`).
- `widgets.dashboard_id uuid` (FK → dashboards, NOT NULL après backfill des lignes existantes vers la version par défaut).
- `site_settings` rattaché par version (`dashboard_id`), backfill idem. La présence admin (fuseau/coords) reste **globale** (c'est l'appareil de l'admin, pas une version).
- Contrainte : la version par défaut ne peut être ni supprimée ni renommée en slug ≠ `default` (garde côté app + policy/trigger si simple).

### Web public

1. Route `app/qrcode/[slug]/page.tsx` : même rendu que `/qrcode` mais sur la version du slug ; slug inconnu → 404. `/qrcode` continue de servir la version par défaut **sans aucun changement d'URL ni de comportement** (y compris le fallback config locale sans env vars). Factoriser le rendu dans un composant commun plutôt que dupliquer la page.
2. Realtime : abonnements filtrés par `dashboard_id` (une modif sur la version « travail » ne re-render pas la version par défaut, et inversement).
3. Métadonnées/OG : `generateMetadata` par slug (titre/tagline de l'en-tête de la version) ; l'OG image bento existante est réutilisée avec les données de la version (si le générateur ne s'y prête pas facilement, fallback sur l'OG par défaut — ne pas sur-investir).
4. Compteur de visites : RPC inchangée, compte global (décision par défaut).

### Admin (app mobile + web)

5. `packages/shared` : requêtes (`getWidgets`, `upsertWidget`, `getSettings`…) paramétrées par `dashboardId` + nouvelles requêtes `listDashboards`, `createDashboard`, `duplicateDashboard` (copie widgets + settings, **les médias sont partagés, pas re-uploadés** — d'où le garde-fou cross-références de la phase 7), `deleteDashboard` (interdit sur la défaut ; supprime widgets + settings + médias devenus orphelins via la logique phase 7).
6. **App mobile** : sélecteur de version en haut de l'écran principal (chips ou dropdown) ; TOUTE l'app (grille drag 2D, éditeurs, en-tête, toggle breakpoint) opère sur la version sélectionnée ; actions créer (nom + slug auto-généré) / dupliquer / supprimer avec confirmation. Le bouton « Rendu réel » ouvre l'URL de la version sélectionnée.
7. **Admin web `/adminqrcode`** : même sélecteur de version, CRUD existant scopé sur la version sélectionnée (pas de rattrapage complet de l'admin web, juste le scoping + le sélecteur + créer/dupliquer/supprimer).

**Critères d'acceptation** : `/qrcode` inchangé au pixel près avant/après migration (widgets existants tous rattachés à la défaut) ; créer une version « travail », la peupler depuis l'app, ouvrir `cenacrew.com/qrcode/travail` → contenu distinct, en-tête distinct, Realtime scopé ; supprimer la version « travail » ne touche ni la défaut ni les médias partagés ; slug inconnu → 404 propre.

---

## Phase 9 — Workflow QA « test widgets »

**But** : quand un type de widget est créé ou modifié, il repasse « à vérifier » ; une interface affiche chaque type à vérifier dans **tous ses formats** ; l'utilisateur coche ce qui est bon ; le reste est consigné (note + screenshot) en base + issue GitHub pour qu'Opus corrige.

### A. Détection « à vérifier » (hash auto + manuel)

1. Script `scripts/compute-widget-hashes.ts` (lancé en `prebuild` de `apps/web`) : pour chaque type du registre, hash stable (sha256) du dossier `apps/web/src/widgets/<type>/` + de son schéma partagé dans `packages/shared` → génère `apps/web/src/widgets/qa-manifest.json` (généré au build, gitignoré ou committé — au choix d'Opus, documenter).
2. Migration `0008` : table `widget_qa` : `widget_type text, format text, validated_hash text, status text ('pending'|'ok'|'issue'), note text, screenshot_url text, updated_at` (pk `(widget_type, format)`). RLS : lecture ET écriture réservées au rôle authentifié (rien de public).
3. Un couple (type, format) est « à vérifier » si `validated_hash` est absent ou ≠ hash courant du manifest. Bouton « re-vérifier ce widget » dans l'interface = reset du `validated_hash` (forçage manuel).

### B. Interface de test `/adminqrcode/test` (web, protégée par la même auth admin)

4. Rend, pour chaque type à vérifier, les **vrais Renderer publics** dans chaque format autorisé, dans deux sections : contexte mobile (grille 3 colonnes, largeur ~390 px) et contexte desktop (9 colonnes). Données d'exemple : ajouter un `sampleConfig` par type dans le registre (réutiliser `defaultConfig` quand il est déjà parlant ; pour les widgets à données serveur — Spotify, LoL, météo, Letterboxd — rendre avec les vraies données si dispo, sinon leur état de dégradation, qui fait aussi partie de ce qu'on audite).
5. Interaction : tap/clic sur une tuile = validée (coche visible, re-clic pour décocher). Les non-cochées ont un champ note libre (« explique le problème avec tes mots »). Compteur « X restants » en haut.
6. **Screenshots** : pour chaque tuile NON validée, capture client-side du DOM de la tuile (`html-to-image`, lib locale sans service externe), upload dans `widget-media/qa/<type>-<format>-<date>.png`.
7. Bouton « Terminer la session » : les validées → `validated_hash` = hash courant, `status = ok` ; les non validées → `status = issue` + note + screenshot en base, puis **une** issue GitHub créée/mise à jour (une issue par session de test, tableau type/format/note + liens screenshots) via une API route serveur (`app/api/admin/qa-report`) et `GITHUB_TOKEN` en env var serveur (jamais exposé). Sans token configuré : la partie base fonctionne quand même, l'issue est simplement sautée avec un avertissement affiché.
8. **App mobile** : entrée « Test widgets » (menu ou badge « X à vérifier ») qui ouvre `/adminqrcode/test` en WebView. La WebView présente l'écran de login admin à la première ouverture (cookies de session WebView persistants ensuite) — pas de partage de session Supabase entre l'app et la WebView, c'est assumé et documenté.

**Critères d'acceptation** : modifier le Renderer d'un widget → il repasse « à vérifier » au build suivant ; la page de test affiche tous ses formats dans les deux contextes ; cocher puis terminer → il disparaît de la liste et n'y revient pas tant que son code ne change pas ; ne pas cocher avec une note → ligne `issue` en base, screenshot lisible dans le bucket, issue GitHub créée avec note + image ; le tout accessible depuis l'app via la WebView.

---

## Secrets / actions utilisateur

- **`GITHUB_TOKEN`** (phase 9) : token fine-grained limité au repo, permission Issues read/write, à mettre dans les env vars Vercel + `apps/web/.env.local`. À demander à l'utilisateur au moment de la phase 9, jamais committé.
- **Purge bucket** (phase 7) : dry-run montré à l'utilisateur avant `--apply` (exécuté par l'orchestrateur).
- **Analytics** (phase 6) : activer Analytics + Speed Insights dans le dashboard Vercel du projet (côté utilisateur, 2 clics).

## Notes pour Opus (exécutant)

- Travailler phase par phase, **une série de commits par phase**, sans attribution IA dans les commits.
- Ne jamais déployer un état où `cenacrew.com/qrcode` casse — en particulier la migration `0007` (backfill AVANT de rendre `dashboard_id` NOT NULL, et le code web doit tolérer l'état pré-migration).
- À chaque UI : charger le skill `frontend-design` d'abord. Mobile d'abord.
- Preuves exigées : `pnpm build` + `pnpm lint` verts à chaque phase, comportement vérifié (dev server, et Expo Go pour l'app quand c'est testable sans device — sinon lister précisément quoi tester à l'utilisateur).
- En cas de doute d'architecture : demander à Fable (orchestrateur) plutôt qu'improviser.
