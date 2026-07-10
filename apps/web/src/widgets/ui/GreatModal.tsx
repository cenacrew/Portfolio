"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Shared large modal used by the toile and the guestbook (phase 4.10 A6/A13).
//
// Phase 4.11 A1 — real pop-up over the whole dashboard. The tiles use
// `container-type: size` (for container queries), which makes each `.qr-tile`
// a containing block for `position: fixed` descendants — so a modal rendered
// inside a widget was pinned INSIDE its tile (inputs clipped, unusable). Fix:
// render the overlay through a React portal, OUT of the tile's DOM subtree.
//
// Target = the `.qr-page` root, not `document.body`: `.qr-page` carries the
// palette variables (--c1/--c2, live palette-button overrides), the dark-mode
// scope and the --font-bricolage face, and it is NOT a containing block for
// fixed (no transform/filter/contain), so `position: fixed` still resolves to
// the viewport and covers the whole board. Falls back to body if not found.
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
  const [target, setTarget] = useState<HTMLElement | null>(null);

  // Resolve the portal target on mount (client only).
  useEffect(() => {
    setTarget(document.querySelector<HTMLElement>(".qr-page") ?? document.body);
  }, []);

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

  if (!target) return null;

  return createPortal(
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
    </div>,
    target,
  );
}
