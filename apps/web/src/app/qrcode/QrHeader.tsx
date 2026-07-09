/* eslint-disable @next/next/no-img-element */
import ThemeToggle from "./ThemeToggle";

export default function QrHeader() {
  return (
    <header className="qr-header">
      <div className="qr-header__top">
        <span className="qr-avatar">
          <img src="/files/img/pp.png" alt="Valentin Sourdois Pajot" />
          <span className="qr-avatar__ring" aria-hidden />
        </span>
        <ThemeToggle />
      </div>

      <h1 className="qr-name">Valentin Sourdois&nbsp;Pajot</h1>
      <p className="qr-tag">Développeur Full-Stack · créatif du numérique</p>

      <div className="qr-chips">
        <span className="qr-chip">
          <span className="w-live" aria-hidden /> Dispo pour un projet
        </span>
        <span className="qr-chip">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden>
            <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
          </svg>
          Bordeaux
        </span>
      </div>
    </header>
  );
}
