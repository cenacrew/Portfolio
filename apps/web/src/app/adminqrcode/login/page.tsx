import LoginForm from "./LoginForm";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <main className="admin-login">
      <div className="admin-login__card">
        <span className="admin-login__eyebrow">Console privée</span>
        <h1 className="admin-login__title">Dashboard</h1>
        <p className="admin-login__sub">Connecte-toi pour éditer le tableau.</p>
        <LoginForm configured={isSupabaseConfigured()} />
      </div>
      <span className="admin-login__foot">cenacrew.com/qrcode</span>
    </main>
  );
}
