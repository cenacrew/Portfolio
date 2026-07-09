"use client";

import { useEffect, useState } from "react";

// Standalone dark-mode control for the dashboard (the QR page has no site
// nav). Uses the same mechanism as the portfolio: toggles `dark-mode` on
// <body> and persists the choice in localStorage.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.body.classList.contains("dark-mode"));
  }, []);

  function toggle() {
    const next = !document.body.classList.contains("dark-mode");
    document.body.classList.toggle("dark-mode", next);
    try {
      localStorage.setItem("dark-mode", String(next));
    } catch {}
    setDark(next);
  }

  return (
    <button
      className="qr-theme"
      onClick={toggle}
      aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
      title={dark ? "Mode clair" : "Mode sombre"}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
          <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.7 5.7 1.4 1.4M4.9 4.9l1.4 1.4m0 11.4-1.4 1.4M19.1 4.9l-1.4 1.4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
