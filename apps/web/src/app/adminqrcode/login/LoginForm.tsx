"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export default function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured) {
    return (
      <p className="admin-login__notice">
        Supabase n’est pas encore configuré. Renseigne les variables d’environnement puis recharge cette page.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Supabase indisponible.");
      setBusy(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Identifiants incorrects.");
      setBusy(false);
      return;
    }
    // Middleware picks up the fresh session cookie on navigation.
    router.replace("/adminqrcode");
    router.refresh();
  }

  return (
    <form className="admin-login__form" onSubmit={submit}>
      <label className="ed-field">
        <span className="ed-label">Email</span>
        <input
          className="ed-input"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="ed-field">
        <span className="ed-label">Mot de passe</span>
        <input
          className="ed-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && <span className="admin-login__error">{error}</span>}
      <button className="admin-btn admin-btn--primary" type="submit" disabled={busy}>
        {busy ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
