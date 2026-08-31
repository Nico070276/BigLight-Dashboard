"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import { Lock } from "lucide-react";

type Phase = "verifying" | "ready" | "error" | "done";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Le client Supabase émet PASSWORD_RECOVERY / SIGNED_IN quand la session
    // de récupération est établie (lien implicite ou après échange du code).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setPhase("ready");
    });

    async function init() {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        setPhase(exErr ? "error" : "ready");
        return;
      }
      // Pas de code : peut-être une session déjà présente (flux implicite)
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setPhase("ready");
      } else {
        // Laisser une chance à onAuthStateChange, sinon considérer le lien invalide
        setTimeout(async () => {
          const { data: d2 } = await supabase.auth.getSession();
          setPhase((p) => (p === "ready" ? p : d2.session ? "ready" : "error"));
        }, 1500);
      }
    }
    init();

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    setError(null);

    const { error: updErr } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updErr) {
      setError("Échec de la mise à jour. Le lien a peut-être expiré — refais une demande.");
      return;
    }

    await supabase.auth.signOut();
    setPhase("done");
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#fafaf9]">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="BIG LIGHT" width={120} height={80} className="h-20 w-auto mb-4" />
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
          <p className="text-sm text-muted mt-1">Choisis un nouveau mot de passe administrateur</p>
        </div>

        <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
          {phase === "verifying" && (
            <p className="text-sm text-muted text-center py-4">Vérification du lien...</p>
          )}

          {phase === "error" && (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                Ce lien de réinitialisation est invalide ou a expiré.
              </div>
              <Link
                href="/forgot-password"
                className="flex items-center justify-center gap-2 w-full bg-[#1a1a1a] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-black"
              >
                Refaire une demande
              </Link>
            </div>
          )}

          {phase === "done" && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              Mot de passe mis à jour. Redirection vers la connexion...
            </div>
          )}

          {phase === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    placeholder="8 caractères minimum"
                    className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:border-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:border-foreground"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#1a1a1a] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-black disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Définir le mot de passe"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6">BIG LIGHT · Luxembourg</p>
      </div>
    </div>
  );
}
