-- ============================================================
-- Phase 3 — Seed widgets. Run LAST (after 0001_schema, 0002_rls, 0003_storage).
-- Generated from apps/web/src/config/widgets.config.ts — the exact widgets the
-- public /qrcode dashboard shipped with in phase 2. Ids are assigned by the
-- database (gen_random_uuid); order is preserved via the position column.
--
-- Idempotent by design: inserts ONLY when the widgets table is still empty, so
-- re-running never duplicates rows. To reseed from scratch, TRUNCATE first:
--   truncate public.widgets cascade;
-- ============================================================

insert into public.widgets (type, config, layout, visible, position, created_at)
select v.type, v.config, v.layout, v.visible, v.position, v.created_at
from (values
    ('status', '{"emoji":"🎧","text":"En alternance chez SQLI — je code ce dashboard bento en Next.js.","updated":"Mis à jour aujourd''hui"}'::jsonb, '{"mobile":{"x":0,"y":0,"w":2,"h":1},"desktop":{"x":0,"y":0,"w":2,"h":1}}'::jsonb, true, 0, '2026-07-01T09:00:00.000Z'),
    ('weather', '{"city":"Bordeaux","lat":44.8378,"lng":-0.5792}'::jsonb, '{"mobile":{"x":2,"y":0,"w":1,"h":1},"desktop":{"x":2,"y":0,"w":1,"h":1}}'::jsonb, true, 1, '2026-07-01T09:00:00.000Z'),
    ('location-map', '{"city":"Bordeaux","lat":44.8378,"lng":-0.5792,"zoom":12,"caption":"Bordeaux, France"}'::jsonb, '{"mobile":{"x":0,"y":1,"w":2,"h":2},"desktop":{"x":0,"y":1,"w":2,"h":2}}'::jsonb, true, 2, '2026-07-01T09:00:00.000Z'),
    ('social-link', '{"platform":"github","url":"https://github.com/cenacrew","handle":"@cenacrew"}'::jsonb, '{"mobile":{"x":2,"y":1,"w":1,"h":1},"desktop":{"x":3,"y":0,"w":1,"h":1}}'::jsonb, true, 3, '2026-07-01T09:00:00.000Z'),
    ('social-link', '{"platform":"linkedin","url":"https://www.linkedin.com/in/valentin-sourdois-pajot/","handle":"Valentin S. Pajot"}'::jsonb, '{"mobile":{"x":2,"y":2,"w":1,"h":1},"desktop":{"x":2,"y":1,"w":1,"h":1}}'::jsonb, true, 4, '2026-07-01T09:00:00.000Z'),
    ('github-stats', '{"username":"cenacrew","weeks":10}'::jsonb, '{"mobile":{"x":0,"y":3,"w":3,"h":2},"desktop":{"x":2,"y":2,"w":2,"h":2}}'::jsonb, true, 5, '2026-07-01T09:00:00.000Z'),
    ('spotify-embed', '{"url":"https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M","title":"Ma playlist du moment"}'::jsonb, '{"mobile":{"x":0,"y":5,"w":2,"h":2},"desktop":{"x":0,"y":3,"w":2,"h":2}}'::jsonb, true, 6, '2026-07-01T09:00:00.000Z'),
    ('countdown', '{"title":"Diplôme","target":"2026-09-01T00:00:00.000Z","emoji":"🎓"}'::jsonb, '{"mobile":{"x":2,"y":5,"w":1,"h":1},"desktop":{"x":3,"y":1,"w":1,"h":1}}'::jsonb, true, 7, '2026-07-01T09:00:00.000Z'),
    ('visitor-counter', '{"count":1287,"label":"visites"}'::jsonb, '{"mobile":{"x":2,"y":6,"w":1,"h":1},"desktop":{"x":2,"y":4,"w":1,"h":1}}'::jsonb, true, 8, '2026-07-01T09:00:00.000Z'),
    ('spotify-now-playing', '{"isPlaying":true,"track":"Redbone","artist":"Childish Gambino","progressMs":96000,"durationMs":327000}'::jsonb, '{"mobile":{"x":0,"y":7,"w":2,"h":1},"desktop":{"x":0,"y":5,"w":2,"h":1}}'::jsonb, true, 9, '2026-07-01T09:00:00.000Z'),
    ('social-link', '{"platform":"instagram","url":"https://instagram.com/cenacrew","handle":"@cenacrew"}'::jsonb, '{"mobile":{"x":2,"y":7,"w":1,"h":1},"desktop":{"x":3,"y":4,"w":1,"h":1}}'::jsonb, true, 10, '2026-07-01T09:00:00.000Z'),
    ('photo', '{"images":[{"src":"/files/img/pp.png","alt":"Valentin","caption":"Moi"},{"src":"/files/img/creation.png","alt":"Création graphique","caption":"Créations"},{"src":"/files/img/JPO.png","alt":"Affiche JPO","caption":"Affiche JPO"}]}'::jsonb, '{"mobile":{"x":0,"y":8,"w":2,"h":2},"desktop":{"x":2,"y":5,"w":2,"h":2}}'::jsonb, true, 11, '2026-07-01T09:00:00.000Z'),
    ('note', '{"text":"Bienvenue sur mon coin du web ✨\nExplore, et laisse un mot dans le **livre d''or** !","tone":"amber","signature":"Valentin"}'::jsonb, '{"mobile":{"x":2,"y":8,"w":1,"h":2},"desktop":{"x":0,"y":6,"w":1,"h":2}}'::jsonb, true, 12, '2026-07-01T09:00:00.000Z'),
    ('watchlist', '{"title":"Ma watchlist","items":[{"title":"Arcane","status":"done","current":18,"total":18,"accent":"#3b2a63"},{"title":"Severance","status":"watching","current":4,"total":10,"accent":"#0d3b4a"},{"title":"One Piece","status":"watching","current":1089,"total":1122,"accent":"#8a4b1e"}]}'::jsonb, '{"mobile":{"x":0,"y":10,"w":2,"h":2},"desktop":{"x":1,"y":7,"w":2,"h":2}}'::jsonb, true, 13, '2026-07-01T09:00:00.000Z'),
    ('poll', '{"question":"Prochain projet à coder ?","options":[{"id":"app","label":"Une app mobile","votes":34},{"id":"game","label":"Un jeu","votes":21},{"id":"tool","label":"Un outil dev","votes":17}]}'::jsonb, '{"mobile":{"x":2,"y":10,"w":1,"h":2},"desktop":{"x":3,"y":7,"w":1,"h":2}}'::jsonb, true, 14, '2026-07-01T09:00:00.000Z'),
    ('guestbook', '{"title":"Livre d''or","prompt":"Laisse-moi un petit mot","seed":[{"author":"Léa","message":"Trop stylé ce dashboard !","createdAt":"2026-07-01T09:00:00.000Z"},{"author":"Max","message":"Le QR code marche nickel 👌","createdAt":"2026-07-01T09:00:00.000Z"},{"author":"Anonyme","message":"GG pour l''alternance 💪","createdAt":"2026-07-01T09:00:00.000Z"}]}'::jsonb, '{"mobile":{"x":0,"y":12,"w":3,"h":2},"desktop":{"x":0,"y":9,"w":2,"h":2}}'::jsonb, true, 15, '2026-07-01T09:00:00.000Z'),
    ('free-link', '{"title":"Mini-RSA","url":"https://mini-rsa.vercel.app","description":"Chiffrer & déchiffrer un message avec RSA","emoji":"🔐","accent":"linear-gradient(150deg,#2a2977,#0d0c62)"}'::jsonb, '{"mobile":{"x":0,"y":14,"w":2,"h":1},"desktop":{"x":2,"y":9,"w":2,"h":1}}'::jsonb, true, 16, '2026-07-01T09:00:00.000Z'),
    ('social-link', '{"platform":"x","url":"https://x.com/cenacrew","handle":"@cenacrew"}'::jsonb, '{"mobile":{"x":2,"y":14,"w":1,"h":1},"desktop":{"x":1,"y":6,"w":1,"h":1}}'::jsonb, true, 17, '2026-07-01T09:00:00.000Z')
) as v(type, config, layout, visible, position, created_at)
where not exists (select 1 from public.widgets);
