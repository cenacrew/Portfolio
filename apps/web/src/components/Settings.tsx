"use client";

import { useEffect, useState } from "react";
import { PaletteIcon, MoonIcon } from "./icons";

// Bloc ".features" : drapeau UK, bouton palette (décoratif) et interrupteur
// dark mode. Reprend le comportement de l'ancien DMFunction() (toggle de la
// classe `dark-mode` sur <body>) en ajoutant la persistance localStorage.
export default function Settings() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.body.classList.contains("dark-mode"));
  }, []);

  function toggleDarkMode() {
    const isDark = document.body.classList.toggle("dark-mode");
    setDark(isDark);
    try {
      localStorage.setItem("dark-mode", String(isDark));
    } catch {
      // ignore (mode privé, quota, etc.)
    }
  }

  return (
    <div className="features">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img id="uk" alt="UK Flag" src="/files/img/uk.png" />
      <div className="settings">
        <div className="colors">
          <p className="s-button s">new</p>
          <PaletteIcon />
        </div>

        {/* DarkMode */}
        <div className="darkmode">
          <label className="switch s-button">
            <input type="checkbox" checked={dark} onChange={toggleDarkMode} />
            <span className="slider round"></span>
          </label>
          <MoonIcon />
        </div>
      </div>
    </div>
  );
}
