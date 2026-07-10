"use client";

import { useEffect, type ReactNode } from "react";

// Shared large modal used by the toile and the guestbook (phase 4.10 A6/A13).
// Takes ~90% of a phone screen and a comfortable large panel on desktop; closes
// on the X, on a click outside the panel, and on Escape; locks body scroll.
export default function GreatModal({
  title,
  onClose,
  children,
  className,
  labelledBy,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock background scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="gmodal"
      role="dialog"
      aria-modal="true"
      aria-label={labelledBy ? undefined : title}
      aria-labelledby={labelledBy}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`gmodal__panel${className ? ` ${className}` : ""}`}>
        <div className="gmodal__bar">
          <span className="gmodal__title">{title}</span>
          <button className="gmodal__x" onClick={onClose} aria-label="Fermer" type="button">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="gmodal__body">{children}</div>
      </div>
    </div>
  );
}
