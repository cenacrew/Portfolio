"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DashboardRow } from "@portfolio/shared";
import { createDashboardAction, deleteDashboardAction, duplicateDashboardAction } from "./actions";

// Version selector for the web admin (phase 8). A slim strip under the topbar:
// pick a version (re-renders the board scoped to it via ?d=<slug>), or create /
// duplicate / delete versions. The default version can't be deleted.
export default function VersionBar({
  dashboards,
  selectedSlug,
}: {
  dashboards: DashboardRow[];
  selectedSlug: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // mode: null (idle) | "create" | "duplicate" — drives the inline name input.
  const [mode, setMode] = useState<null | "create" | "duplicate">(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = dashboards.find((d) => d.slug === selectedSlug) ?? dashboards[0];
  // Versions only exist once migrated (a real, non-empty id).
  const migrated = dashboards.some((d) => d.id);

  function select(slug: string) {
    startTransition(() => router.push(`/adminqrcode?d=${encodeURIComponent(slug)}`));
  }

  function openCreate() {
    setMode("create");
    setName("");
    setError(null);
  }
  function openDuplicate() {
    setMode("duplicate");
    setName(`${selected?.name || "Version"} (copie)`);
    setError(null);
  }
  function cancel() {
    setMode(null);
    setName("");
    setError(null);
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const created =
        mode === "duplicate" && selected?.id
          ? await duplicateDashboardAction(selected.id, trimmed)
          : await createDashboardAction(trimmed);
      cancel();
      router.push(`/adminqrcode?d=${encodeURIComponent(created.slug)}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected?.id || selected.is_default || busy) return;
    if (!window.confirm(`Supprimer la version « ${selected.name} » ? Ses widgets et médias non partagés seront effacés.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteDashboardAction(selected.id);
      const fallback = dashboards.find((d) => d.is_default) ?? dashboards[0];
      router.push(`/adminqrcode?d=${encodeURIComponent(fallback.slug)}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-versions">
      <div className="admin-versions__scroll" role="tablist" aria-label="Versions du dashboard">
        {dashboards.map((d) => (
          <button
            key={d.slug}
            role="tab"
            aria-selected={d.slug === selectedSlug}
            className={`admin-ver${d.slug === selectedSlug ? " is-on" : ""}`}
            onClick={() => select(d.slug)}
            disabled={pending}
            title={d.is_default ? "Version par défaut (/qrcode)" : `/qrcode/${d.slug}`}
          >
            {d.is_default ? "★ " : ""}
            {d.name || d.slug}
          </button>
        ))}
      </div>

      <div className="admin-versions__actions">
        {mode ? (
          <div className="admin-ver__new">
            <input
              autoFocus
              className="admin-ver__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") cancel();
              }}
              placeholder={mode === "duplicate" ? "Nom de la copie" : "Nom de la version"}
              maxLength={60}
            />
            <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={submit} disabled={busy}>
              {busy ? "…" : mode === "duplicate" ? "Dupliquer" : "Créer"}
            </button>
            <button className="admin-btn admin-btn--ghost admin-btn--sm" onClick={cancel} disabled={busy}>
              Annuler
            </button>
          </div>
        ) : migrated ? (
          <>
            <button className="admin-btn admin-btn--ghost admin-btn--sm" onClick={openDuplicate} disabled={busy || !selected?.id}>
              Dupliquer
            </button>
            {selected && !selected.is_default ? (
              <button className="admin-btn admin-btn--danger admin-btn--sm" onClick={remove} disabled={busy}>
                Supprimer
              </button>
            ) : null}
            <button className="admin-btn admin-btn--primary admin-btn--sm" onClick={openCreate} disabled={busy}>
              + Version
            </button>
          </>
        ) : (
          <span className="admin-versions__hint">Migration 0007 requise pour gérer plusieurs versions.</span>
        )}
      </div>

      {error ? <p className="admin-versions__error">{error}</p> : null}
    </div>
  );
}
