import type { ReactNode } from "react";
import type { SocialLinkConfig } from "./schema";

// Brand identity per platform: gradient + a "foreground on brand" colour +
// a simple glyph. Kept local to the widget so the whole thing is self-contained.
type Brand = {
  name: string;
  gradient: string;
  fg: string;
  glyph: ReactNode;
};

const g = (paths: ReactNode) => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor" aria-hidden>
    {paths}
  </svg>
);

export const BRANDS: Record<SocialLinkConfig["platform"], Brand> = {
  github: {
    name: "GitHub",
    gradient: "linear-gradient(150deg,#3a3a3a,#111)",
    fg: "#ffffff",
    glyph: g(
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11 11 0 0 1 6 0C17.3 4.4 18.3 4.7 18.3 4.7c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />,
    ),
  },
  linkedin: {
    name: "LinkedIn",
    gradient: "linear-gradient(150deg,#0a85c9,#0a66c2)",
    fg: "#ffffff",
    glyph: g(
      <path d="M20.4 3H3.6A.6.6 0 0 0 3 3.6v16.8a.6.6 0 0 0 .6.6h16.8a.6.6 0 0 0 .6-.6V3.6a.6.6 0 0 0-.6-.6zM8.3 18.3H5.6V9.6h2.7v8.7zM6.9 8.4a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2zm11.4 9.9h-2.7v-4.2c0-1-.4-1.7-1.3-1.7-.7 0-1.1.5-1.3 1-.1.2-.1.4-.1.7v4.2H10.2s.1-7.6 0-8.7h2.7v1.2c.4-.6 1-1.4 2.5-1.4 1.8 0 3.1 1.2 3.1 3.7v5.2z" />,
    ),
  },
  instagram: {
    name: "Instagram",
    gradient: "linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf)",
    fg: "#ffffff",
    glyph: g(
      <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9a3.7 3.7 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.2A6.6 6.6 0 1 0 12 18.6 6.6 6.6 0 0 0 12 5.4zm0 10.9a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6zM18.9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />,
    ),
  },
  x: {
    name: "X",
    gradient: "linear-gradient(150deg,#2b2b2b,#000)",
    fg: "#ffffff",
    glyph: g(
      <path d="M18.2 2.5h3.3l-7.2 8.2 8.5 11.3h-6.7l-5.2-6.9-6 6.9H1.6l7.7-8.8L1.1 2.5h6.9l4.7 6.3 5.5-6.3zm-1.2 17.8h1.8L7.1 4.3H5.2l11.8 16z" />,
    ),
  },
  discord: {
    name: "Discord",
    gradient: "linear-gradient(150deg,#7c88f0,#5865f2)",
    fg: "#ffffff",
    glyph: g(
      <path d="M20.3 4.9a19.8 19.8 0 0 0-4.9-1.5l-.2.5c1.6.4 2.9 1 4.2 1.7-2.1-1-4.4-1.5-6.4-1.5-2 0-4.3.5-6.4 1.5 1.3-.7 2.6-1.3 4.2-1.7l-.2-.5A19.8 19.8 0 0 0 3.7 4.9C1.1 8.7.4 12.4.7 16.1a20 20 0 0 0 6 3c.5-.6.9-1.3 1.2-2-.7-.3-1.3-.6-1.9-1l.5-.3c3.6 1.7 7.5 1.7 11 0l.5.3c-.6.4-1.2.7-1.9 1 .4.7.8 1.4 1.2 2a20 20 0 0 0 6-3c.4-4.3-.7-8-3-11.2zM8.9 13.9c-1.2 0-2.1-1.1-2.1-2.4 0-1.3.9-2.4 2.1-2.4s2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4zm6.3 0c-1.2 0-2.1-1.1-2.1-2.4 0-1.3.9-2.4 2.1-2.4s2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4z" />,
    ),
  },
  youtube: {
    name: "YouTube",
    gradient: "linear-gradient(150deg,#ff4d4d,#f00)",
    fg: "#ffffff",
    glyph: g(
      <path d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.5 3.9 12 3.9 12 3.9s-7.5 0-9.4.5A3 3 0 0 0 .5 6.5C0 8.4 0 12 0 12s0 3.6.5 5.5a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.5.5-5.5s0-3.6-.5-5.5zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />,
    ),
  },
  twitch: {
    name: "Twitch",
    gradient: "linear-gradient(150deg,#a970ff,#772ce8)",
    fg: "#ffffff",
    glyph: g(
      <path d="M4.3 0 1.4 2.9v18.3h6.3V24l2.9-2.8h4.7L21.6 15V0H4.3zm15.4 14L16 17.7h-4.7L8.4 20.5v-2.8H3.6V1.9h16.1V14zM15.7 5.7h-1.9v5.7h1.9V5.7zm-5.2 0H8.6v5.7h1.9V5.7z" />,
    ),
  },
  email: {
    name: "Email",
    gradient: "linear-gradient(150deg,#5b6470,#39424e)",
    fg: "#ffffff",
    glyph: g(
      <path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.5 8-5.2V6H4v1.3l8 5.2zM4 9v9h16V9l-7.4 4.8a1 1 0 0 1-1.2 0L4 9z" />,
    ),
  },
  generic: {
    name: "Lien",
    gradient: "linear-gradient(150deg,#2a2977,#0d0c62)",
    fg: "#ffffff",
    glyph: g(
      <path d="M10.6 13.4a3 3 0 0 0 4.5.3l3-3a3 3 0 0 0-4.3-4.3l-1.4 1.4a1 1 0 0 0 1.4 1.4l1.4-1.4a1 1 0 0 1 1.5 1.5l-3 3a1 1 0 0 1-1.5 0 1 1 0 0 0-1.4 1.4zm2.8-2.8a3 3 0 0 0-4.5-.3l-3 3a3 3 0 0 0 4.3 4.3l1.4-1.4a1 1 0 0 0-1.4-1.4l-1.4 1.4a1 1 0 0 1-1.5-1.5l3-3a1 1 0 0 1 1.5 0 1 1 0 0 0 1.4-1.4z" />,
    ),
  },
};
