"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { Lock, Mail } from "lucide-react";

export default function ParametresPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage({ type: "err", text: "Le mot de passe doit contenir au moins 8 caractères." });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: "err", text: "Les deux mots de passe ne correspondent pas." });
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setMessage({ type: "err", text: "Échec de la mise à jour. Reconnecte-toi puis réessaie." });
      return;
    }

    setPassword("");
    setConfirm("");
    setMessage({ type: "ok", text: "Mot de passe mis à jour avec succès." });
  }

  return (
    <AppShell>
      <TopBar title="Paramètres" />

      <div className="max-w-xl space-y-5">
        {/* Mon compte */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm mb-4">Mon compte</h3>
          <div className="flex items-center gap-2 text-sm">
            <Mail size={16} className="text-muted" />
            <span className="font-medium">{email || "—"}</span>
          </div>
        </div>

        {/* Changer le mot de passe */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold text-sm mb-4">Changer mon mot de passe</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">Nouveau mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            {message && (
              <div
                className={`p-3 rounded-lg text-xs ${
                  message.type === "ok"
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="bg-[#1a1a1a] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-black disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Mettre à jour le mot de passe"}
            </button>
          </form>
        </div>

        <p className="text-xs text-muted px-1">BIG LIGHT · Luxembourg · v1.0</p>
      </div>
    </AppShell>
  );
}
