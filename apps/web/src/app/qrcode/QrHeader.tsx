/* eslint-disable @next/next/no-img-element */
import HeaderControls from "./HeaderControls";
import { loadHeaderSettings } from "./settings";

export default async function QrHeader() {
  const s = await loadHeaderSettings();

  return (
    <header className="qr-header">
      <div className="qr-header__top">
        <span className="qr-avatar">
          <img src="/files/img/pp.png" alt={s.name} />
          <span className="qr-avatar__ring" aria-hidden />
        </span>
        <HeaderControls />
      </div>

      <h1 className="qr-name">{s.name}</h1>
      <p className="qr-tag">{s.tagline}</p>

      <div className="qr-chips">
        {s.available_show && s.available_text && (
          <span className="qr-chip">
            <span className="w-live" aria-hidden /> {s.available_text}
          </span>
        )}
        {s.location_show && s.location && (
          <span className="qr-chip">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden>
              <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
            </svg>
            {s.location}
          </span>
        )}
        {s.chips.map((c, i) => (
          <span className="qr-chip" key={i}>
            {c.label}
          </span>
        ))}
      </div>
    </header>
  );
}
