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

### Vague 2 (suggestions Fable validées par l'utilisateur)

| Phase | Livrable | Dépend de |
|-------|----------|-----------|
| 10 | Filet de sécurité dev : CI GitHub Actions, tests unitaires du cœur critique, smoke test Playwright `/qrcode`, screenshots QA automatiques | 9 (console de test) |
| 11 | Paramètres & confort : lien sur photo/carrousel, comportement de fin du countdown, son vidéo au tap, dupliquer un widget | 10 (protégé par la CI) |
| 12 | Nouveaux widgets : `contact-card` (vCard), `cv-timeline`, `reactions` | 10 |
| 13 | Widget mini-jeu : **Snake arcade + Flappy** (leaderboards globaux, infra scores partagée) | 12 (infra écriture anonyme réutilisée) |
| 14 | App admin : écran mini-stats + badge « X à vérifier » sur l'entrée QA | 12, 13 (les stats agrègent réactions et scores) |
| 15 | Notifications push (build EAS) avec préférences par source d'événement | 12, 13 (sources d'événements complètes) |

## Décisions d'architecture (validées avec l'utilisateur)

- **Versions du dashboard = versions indépendantes** : table `dashboards` (slug) ; chaque widget appartient à UNE version avec ses propres layouts ; l'en-tête (`site_settings`) est aussi par version ; outil « dupliquer » pour démarrer une nouvelle version depuis la version par défaut. Gestion depuis **l'app mobile ET l'admin web**.
- **QA détection = hash auto du code + forçage manuel** : hash par dossier de type de widget calculé au build, comparé au hash validé en base ; bouton « re-vérifier » manuel dans l'interface.
- **QA interface = web (`/adminqrcode/test`) + accès WebView depuis l'app** (le rendu à auditer est le rendu web public, donc la page de test est web).
- **QA restitution = table Supabase + issue GitHub** (API GitHub, token serveur en env var, jamais côté client) avec note humaine + screenshot uploadé dans le bucket.
- **Widget fichier : tout type, 50 Mo max** (le bucket free tier fait 1 Go au total).
- **Bucket : correction à la racine + purge one-off** (pas seulement un nettoyage ponctuel).
- **Analytics : `@vercel/analytics` + `@vercel/speed-insights`**, tout le site.
- **Vague 2 — priorisation** : la CI (phase 10) passe en premier pour protéger tout le reste ; les notifications push (phase 15) en dernier car elles dépendent des nouvelles sources d'événements et du build EAS.
- **Mini-jeux = Snake arcade + Flappy** (choix utilisateur), infra scores commune, écriture via API route rate-limitée.
- **Notifications push = exception assumée à la règle Expo Go** (APK EAS requis ; no-op propre dans Expo Go). Préférences par source d'événement, stockées en base.
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

## Phase 10 — Filet de sécurité dev (CI, tests, smoke, screenshots QA)

**But** : plus aucun changement ne part en prod sans garde-fou automatique. À faire EN PREMIER dans la vague 2 : tout le reste passera dessus.

1. **CI GitHub Actions** (`.github/workflows/ci.yml`) : sur push/PR — Node 24 + corepack pnpm, `pnpm install`, `pnpm build` (web, sans env vars : le fallback config locale doit suffire), `pnpm lint` (toléré au baseline des 7 erreurs préexistantes tant qu'elles ne sont pas corrigées — les documenter dans le workflow ; idéalement les corriger dans cette phase si trivial, sinon baseline explicite), `tsc --noEmit` mobile, tests unitaires (2), smoke Playwright (3). Cache pnpm.
2. **Tests unitaires (vitest) du cœur critique** dans `packages/shared` : résolveur de collisions/anti-overlap et compactage de lignes vides (cas : push en cascade, bords de grille, breakpoints 3/9 colonnes, layouts déjà chevauchants) + validation des schémas Zod de chaque type de widget (parse de configs valides/invalides, défauts appliqués — ex. `intervalSec`).
3. **Smoke test Playwright** : build + `next start` sans env vars, puis : `/qrcode` répond 200, l'en-tête et les tuiles rendent, **zéro chevauchement** de tuiles mesuré sur les bounding boxes DOM, en viewport 390 px et desktop. `/` (portfolio) répond aussi. C'est le garde automatique de la règle absolue.
4. **Screenshots QA automatiques** (extension phase 9) : script Playwright qui capture chaque type×format×breakpoint rendus par la console de test, publiés en **artifacts du workflow CI**. Contrainte : la console reste protégée en prod — pour la CI, mode local explicite (ex. env `QA_SCREENSHOT_MODE` activable uniquement hors production, ou rendu direct des Renderers dans une page de test non routée en prod). Jamais de page de test non authentifiée accessible en prod.

**Critères d'acceptation** : la CI passe au vert sur main ; casser volontairement le résolveur ou créer un overlap fait échouer la CI ; les artifacts contiennent un screenshot par type×format.

---

## Phase 11 — Paramètres de widgets & confort admin

1. **Lien cliquable sur photo/carrousel** : champ `linkUrl` optionnel dans le schéma partagé du widget photo ; si présent, un tap sur l'image ouvre le lien (nouvel onglet) — les boutons/points de navigation du carrousel restent fonctionnels (pas de conflit tap/swipe).
2. **Countdown — comportement à échéance** : champ `endBehavior` : `message` (texte de fin personnalisé, défaut « C'est parti 🎉 »), `elapsed` (bascule en compteur « depuis » : jours/heures écoulés), `hide` (la tuile disparaît du rendu public). Défaut : `message`. Éditeurs web + mobile.
3. **Vidéo — son au tap** : champ `tapToUnmute` (bool, défaut false) : la vidéo reste autoplay muet en boucle, un tap active/coupe le son. Indicateur discret 🔇/🔊 sur la tuile.
4. **Dupliquer un widget** (app mobile, + admin web si trivial) : action « dupliquer » dans la gestion d'une tuile — copie config + tailles, posée au premier emplacement libre via le résolveur partagé, même version de dashboard. Les médias sont partagés (pas de re-upload — le garde cross-références de la phase 7 protège la suppression).

**Critères d'acceptation** : chaque paramètre visible et éditable dans l'app, effet vérifié sur `/qrcode` ; un countdown échu en mode `hide` disparaît du public mais reste visible/éditable dans l'admin ; dupliquer ne casse jamais la grille (pas d'overlap).

---

## Phase 12 — Nouveaux widgets : `contact-card`, `cv-timeline`, `reactions`

1. **`contact-card`** : tuile « Ajouter à mes contacts » qui télécharge une vCard `.vcf` (nom, prénom, tél?, email?, org?, site?, photo — réutiliser l'avatar de l'en-tête si activé). Génération serveur (API route ou fichier généré à la volée) avec échappement vCard correct. Rendu façon carte de visite, tous formats.
2. **`cv-timeline`** : frise verticale d'entrées manuelles `{ period, title, place, logoUrl?, description? }`, ordonnables dans l'éditeur mobile (ajout/suppression/réordonnancement). Rendu adaptatif : nombre d'entrées visibles selon le format (comme Letterboxd). Pensé pour la version « travail ».
3. **`reactions`** : les visiteurs tapent un emoji et les compteurs s'incrémentent en Realtime. Migration `0009` : table `widget_reactions` (`widget_id, emoji, count`) + RPC `security definer` d'incrément (comme le compteur de visites) ; écriture anonyme via API route (validation Zod + rate limit IP, ex. 10 réactions/min). Config admin : liste d'emojis proposés (défaut ❤️ 🔥 👏 😂). Animation de « pop » au tap. Suppression du widget = purge de ses lignes.

**Critères d'acceptation** : le `.vcf` s'importe correctement sur Android et iOS ; la timeline rend proprement dans tous ses formats ; deux navigateurs ouverts voient les compteurs de réactions bouger en Realtime ; le rate limit bloque le spam.

---

## Phase 13 — Widget mini-jeu : Snake arcade + Flappy

Infra commune, deux jeux (choix utilisateur : Snake **et** Flappy).

1. **Migration `0010`** : table `game_scores` (`id, game text, pseudo text (3 chars, filtre basique), score int, created_at`) — lecture publique, écriture via API route serveur uniquement (validation Zod, rate limit IP, plafond de plausibilité par jeu pour bloquer les scores forgés). RLS stricte.
2. **Widget `mini-game`** : config `{ game: 'snake' | 'flappy', title? }` (deux instances possibles sur la grille). Tuile = aperçu + top 3 du leaderboard ; clic → **grande modal** (portail, comme toile/livre d'or) avec le jeu jouable **tactile ET clavier** : Snake (swipe/flèches), Flappy (tap/espace). Canvas léger, 60 fps, pas de lib de jeu externe lourde.
3. Fin de partie : si le score entre au top 10 → saisie pseudo 3 lettres façon borne d'arcade, envoi via l'API route ; leaderboard top 10 affiché dans la modal, Realtime sur la tuile.

**Critères d'acceptation** : les deux jeux jouables au doigt (390 px) et au clavier (desktop) ; un score soumis apparaît sur un autre navigateur sans refresh ; un POST forgé au-delà du plafond est rejeté ; les jeux passent l'audit QA (console de test) dans tous les formats de tuile.

---

## Phase 14 — App admin : mini-stats + badge QA

1. **Écran « Stats »** dans l'app : total de visites, nombre de mots du guestbook, répartition des votes du sondage, compteurs de réactions, top score + nombre de parties par jeu. Requêtes agrégées simples (lecture authentifiée), pull-to-refresh. Présentation soignée (petites cartes, chiffres qui respirent) — pas besoin de graphiques complexes.
2. **Badge « X à vérifier »** sur l'entrée « 🧪 Test widgets » : endpoint serveur (`/api/admin/qa-pending-count`, authentifié) qui croise le `qa-manifest.json` du build et la table `widget_qa` et renvoie le compte ; l'app l'affiche en badge (rafraîchi à l'ouverture du dashboard).

**Critères d'acceptation** : les chiffres de l'écran Stats correspondent aux données réelles en base ; le badge reflète l'état de la console de test et disparaît quand tout est validé.

---

## Phase 15 — Notifications push (préférences par source)

⚠️ **Exception assumée à la règle Expo Go** : les push distantes exigent le build APK EAS (déjà en place depuis la phase 5). Dans Expo Go, l'écran de préférences reste visible mais l'enregistrement push est no-op avec un message explicatif.

1. **Migration `0011`** : `admin_devices` (`id, expo_push_token, platform, created_at, last_seen_at`) + `notification_prefs` (par source : `enabled`, et pour les visites un mode `off | instant | daily`) — RLS auth only.
2. **Enregistrement** : au login dans l'app (build EAS), demander la permission notifications, enregistrer le token Expo push en base (upsert par token).
3. **Envoi** : dans les API routes serveur existantes, après une écriture réussie et si la source est activée, appel à l'API Expo Push (`exp.host`, gratuite, pas de clé) vers tous les devices enregistrés. **Sources** : guestbook (nouveau mot), toile (nouveau dessin), sondage (nouveau vote), réactions (nouvelle réaction), mini-jeux (nouvelle entrée au top 10), visites (`instant` = chaque visite — assumé spammy, c'est un choix ; `daily` = résumé quotidien via **Vercel cron**, 1 cron/jour sur Hobby).
4. **App : écran « Notifications »** : un toggle par source listée ci-dessus + le sélecteur de mode pour les visites ; état persisté en base (les préférences sont serveur, pas device).

**Critères d'acceptation** : sur l'APK EAS, signer le guestbook depuis un autre appareil fait vibrer le téléphone admin en quelques secondes ; couper une source stoppe ses notifs ; le résumé quotidien des visites part une fois par jour ; Expo Go n'affiche aucune erreur.

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
