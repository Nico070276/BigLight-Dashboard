"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (resetError) {
      setError("Impossible d'envoyer l'email pour le moment. Réessaie dans un instant.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="BIG LIGHT" width={213} height={80} className="h-20 w-auto mb-4" />
          <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
          <p className="text-sm text-muted mt-1">Réinitialisation du mot de passe administrateur</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          {sent ? (
            <div className="space-y-4">
              <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-sm text-success">
                Si un compte existe pour <strong>{email}</strong>, un email contenant un lien de
                réinitialisation vient d&apos;être envoyé. Pense à vérifier tes spams.
              </div>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full bg-accent text-background py-2.5 rounded-lg text-sm font-semibold hover:opacity-90"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-muted">
                Saisis ton email : tu recevras un lien pour définir un nouveau mot de passe.
              </p>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="admin@biglight.lu"
                    className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:border-foreground"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-xs text-danger">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-background py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Envoi..." : "Envoyer le lien"}
              </button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted hover:text-foreground"
              >
                <ArrowLeft size={13} />
                Retour à la connexion
              </Link>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6">BIG LIGHT · Luxembourg</p>
      </div>
    </div>
  );
}
