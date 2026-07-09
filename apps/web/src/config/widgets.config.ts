import type { Widget, WidgetBreakpointLayout } from "@portfolio/shared";

// Local demo data. This array has EXACTLY the shape of the future Supabase
// `widgets` table rows (id, type, config, layout, visible, position,
// created_at). Phase 3 only swaps this source for a DB query — nothing else.
//
// Coordinates below are 0-based cell positions, packed collision-free for
// each breakpoint (3 cols mobile / 4 cols desktop).

const l = (
  mobile: WidgetBreakpointLayout["mobile"],
  desktop: WidgetBreakpointLayout["desktop"],
): WidgetBreakpointLayout => ({ mobile, desktop });

const ts = "2026-07-01T09:00:00.000Z";

export const widgets: Widget[] = [
  {
    id: "status",
    type: "status",
    config: {
      emoji: "🎧",
      text: "En alternance chez SQLI — je code ce dashboard bento en Next.js.",
      updated: "Mis à jour aujourd'hui",
    },
    layout: l({ x: 0, y: 0, w: 2, h: 1 }, { x: 0, y: 0, w: 2, h: 1 }),
    visible: true,
    position: 0,
    createdAt: ts,
  },
  {
    id: "weather",
    type: "weather",
    config: { city: "Bordeaux", lat: 44.8378, lng: -0.5792 },
    layout: l({ x: 2, y: 0, w: 1, h: 1 }, { x: 2, y: 0, w: 1, h: 1 }),
    visible: true,
    position: 1,
    createdAt: ts,
  },
  {
    id: "map",
    type: "location-map",
    config: {
      city: "Bordeaux",
      lat: 44.8378,
      lng: -0.5792,
      zoom: 12,
      caption: "Bordeaux, France",
    },
    layout: l({ x: 0, y: 1, w: 2, h: 2 }, { x: 0, y: 1, w: 2, h: 2 }),
    visible: true,
    position: 2,
    createdAt: ts,
  },
  {
    id: "social-github",
    type: "social-link",
    config: {
      platform: "github",
      url: "https://github.com/cenacrew",
      handle: "@cenacrew",
    },
    layout: l({ x: 2, y: 1, w: 1, h: 1 }, { x: 3, y: 0, w: 1, h: 1 }),
    visible: true,
    position: 3,
    createdAt: ts,
  },
  {
    id: "social-linkedin",
    type: "social-link",
    config: {
      platform: "linkedin",
      url: "https://www.linkedin.com/in/valentin-sourdois-pajot/",
      handle: "Valentin S. Pajot",
    },
    layout: l({ x: 2, y: 2, w: 1, h: 1 }, { x: 2, y: 1, w: 1, h: 1 }),
    visible: true,
    position: 4,
    createdAt: ts,
  },
  {
    id: "github-stats",
    type: "github-stats",
    config: { username: "cenacrew", weeks: 10 },
    layout: l({ x: 0, y: 3, w: 3, h: 2 }, { x: 2, y: 2, w: 2, h: 2 }),
    visible: true,
    position: 5,
    createdAt: ts,
  },
  {
    id: "spotify-embed",
    type: "spotify-embed",
    config: {
      url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
      title: "Ma playlist du moment",
    },
    layout: l({ x: 0, y: 5, w: 2, h: 2 }, { x: 0, y: 3, w: 2, h: 2 }),
    visible: true,
    position: 6,
    createdAt: ts,
  },
  {
    id: "countdown",
    type: "countdown",
    config: {
      title: "Diplôme",
      target: "2026-09-01T00:00:00.000Z",
      emoji: "🎓",
    },
    layout: l({ x: 2, y: 5, w: 1, h: 1 }, { x: 3, y: 1, w: 1, h: 1 }),
    visible: true,
    position: 7,
    createdAt: ts,
  },
  {
    id: "visitor-counter",
    type: "visitor-counter",
    config: { count: 1287, label: "visites" },
    layout: l({ x: 2, y: 6, w: 1, h: 1 }, { x: 2, y: 4, w: 1, h: 1 }),
    visible: true,
    position: 8,
    createdAt: ts,
  },
  {
    id: "now-playing",
    type: "spotify-now-playing",
    config: {
      isPlaying: true,
      track: "Redbone",
      artist: "Childish Gambino",
      progressMs: 96000,
      durationMs: 327000,
    },
    layout: l({ x: 0, y: 7, w: 2, h: 1 }, { x: 0, y: 5, w: 2, h: 1 }),
    visible: true,
    position: 9,
    createdAt: ts,
  },
  {
    id: "social-instagram",
    type: "social-link",
    config: {
      platform: "instagram",
      url: "https://instagram.com/cenacrew",
      handle: "@cenacrew",
    },
    layout: l({ x: 2, y: 7, w: 1, h: 1 }, { x: 3, y: 4, w: 1, h: 1 }),
    visible: true,
    position: 10,
    createdAt: ts,
  },
  {
    id: "photo",
    type: "photo",
    config: {
      images: [
        { src: "/files/img/pp.png", alt: "Valentin", caption: "Moi" },
        { src: "/files/img/creation.png", alt: "Création graphique", caption: "Créations" },
        { src: "/files/img/JPO.png", alt: "Affiche JPO", caption: "Affiche JPO" },
      ],
    },
    layout: l({ x: 0, y: 8, w: 2, h: 2 }, { x: 2, y: 5, w: 2, h: 2 }),
    visible: true,
    position: 11,
    createdAt: ts,
  },
  {
    id: "note",
    type: "note",
    config: {
      text: "Bienvenue sur mon coin du web ✨\nExplore, et laisse un mot dans le **livre d'or** !",
      tone: "amber",
      signature: "Valentin",
    },
    layout: l({ x: 2, y: 8, w: 1, h: 2 }, { x: 0, y: 6, w: 1, h: 2 }),
    visible: true,
    position: 12,
    createdAt: ts,
  },
  {
    id: "watchlist",
    type: "watchlist",
    config: {
      title: "Ma watchlist",
      items: [
        { title: "Arcane", status: "done", current: 18, total: 18, accent: "#3b2a63" },
        { title: "Severance", status: "watching", current: 4, total: 10, accent: "#0d3b4a" },
        { title: "One Piece", status: "watching", current: 1089, total: 1122, accent: "#8a4b1e" },
      ],
    },
    layout: l({ x: 0, y: 10, w: 2, h: 2 }, { x: 1, y: 7, w: 2, h: 2 }),
    visible: true,
    position: 13,
    createdAt: ts,
  },
  {
    id: "poll",
    type: "poll",
    config: {
      question: "Prochain projet à coder ?",
      options: [
        { id: "app", label: "Une app mobile", votes: 34 },
        { id: "game", label: "Un jeu", votes: 21 },
        { id: "tool", label: "Un outil dev", votes: 17 },
      ],
    },
    layout: l({ x: 2, y: 10, w: 1, h: 2 }, { x: 3, y: 7, w: 1, h: 2 }),
    visible: true,
    position: 14,
    createdAt: ts,
  },
  {
    id: "guestbook",
    type: "guestbook",
    config: {
      title: "Livre d'or",
      prompt: "Laisse-moi un petit mot",
      seed: [
        { author: "Léa", message: "Trop stylé ce dashboard !", createdAt: ts },
        { author: "Max", message: "Le QR code marche nickel 👌", createdAt: ts },
        { author: "Anonyme", message: "GG pour l'alternance 💪", createdAt: ts },
      ],
    },
    layout: l({ x: 0, y: 12, w: 3, h: 2 }, { x: 0, y: 9, w: 2, h: 2 }),
    visible: true,
    position: 15,
    createdAt: ts,
  },
  {
    id: "free-link-rsa",
    type: "free-link",
    config: {
      title: "Mini-RSA",
      url: "https://mini-rsa.vercel.app",
      description: "Chiffrer & déchiffrer un message avec RSA",
      emoji: "🔐",
      accent: "linear-gradient(150deg,#2a2977,#0d0c62)",
    },
    layout: l({ x: 0, y: 14, w: 2, h: 1 }, { x: 2, y: 9, w: 2, h: 1 }),
    visible: true,
    position: 16,
    createdAt: ts,
  },
  {
    id: "social-x",
    type: "social-link",
    config: {
      platform: "x",
      url: "https://x.com/cenacrew",
      handle: "@cenacrew",
    },
    layout: l({ x: 2, y: 14, w: 1, h: 1 }, { x: 1, y: 6, w: 1, h: 1 }),
    visible: true,
    position: 17,
    createdAt: ts,
  },
];
