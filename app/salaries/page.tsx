"use client";

import { useEffect, useState } from "react";
import { supabase, type Salarie } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function SalariesPage() {
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Salarie | null>(null);

  async function loadSalaries() {
    setLoading(true);
    const { data } = await supabase.from("salaries").select("*").order("nom");
    setSalaries(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadSalaries();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce salarié ? Ses pointages seront aussi supprimés.")) return;
    await supabase.from("salaries").delete().eq("id", id);
    await loadSalaries();
  }

  function handleEdit(s: Salarie) {
    setEditing(s);
    setShowModal(true);
  }

  function handleAdd() {
    setEditing(null);
    setShowModal(true);
  }

  return (
    <AppShell>
      <TopBar title="Salariés">
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-background rounded-lg text-sm font-semibold hover:opacity-90"
        >
          <Plus size={16} />
          Ajouter un salarié
        </button>
      </TopBar>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted">Chargement...</div>
      ) : salaries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted">
          Aucun salarié enregistré. Cliquez sur &quot;Ajouter un salarié&quot; pour commencer.
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black/[0.02] text-xs uppercase tracking-wider text-muted">
                  <th className="text-left p-3 font-semibold">Nom</th>
                  <th className="text-left p-3 font-semibold">PIN</th>
                  <th className="text-left p-3 font-semibold">Téléphone</th>
                  <th className="text-left p-3 font-semibold">Statut</th>
                  <th className="text-right p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="font-semibold">{s.prenom} {s.nom}</div>
                      {s.email && <div className="text-xs text-muted">{s.email}</div>}
                    </td>
                    <td className="p-3">
                      <code className="bg-black/5 px-2 py-0.5 rounded text-xs">••••</code>
                    </td>
                    <td className="p-3">{s.telephone ?? "—"}</td>
                    <td className="p-3">
                      {s.actif ? (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/15 text-success">● Actif</span>
                      ) : (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-muted">Inactif</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleEdit(s)} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-white/5 mr-1" title="Modifier">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-danger/10 text-danger" title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {salaries.map((s) => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{s.prenom} {s.nom}</div>
                    {s.email && <div className="text-xs text-muted mt-0.5 truncate">{s.email}</div>}
                    {s.telephone && <div className="text-xs text-muted mt-0.5">{s.telephone}</div>}
                  </div>
                  {s.actif ? (
                    <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-success/15 text-success">● Actif</span>
                  ) : (
                    <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-muted">Inactif</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <code className="bg-black/5 px-2 py-0.5 rounded text-xs">PIN ••••</code>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(s)} className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-border bg-card" title="Modifier">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-border bg-card text-danger" title="Supprimer">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <SalarieModal
          salarie={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            loadSalaries();
          }}
        />
      )}
    </AppShell>
  );
}

function SalarieModal({
  salarie,
  onClose,
  onSaved,
}: {
  salarie: Salarie | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nom, setNom] = useState(salarie?.nom ?? "");
  const [prenom, setPrenom] = useState(salarie?.prenom ?? "");
  const [email, setEmail] = useState(salarie?.email ?? "");
  const [telephone, setTelephone] = useState(salarie?.telephone ?? "");
  const [pin, setPin] = useState("");
  const [actif, setActif] = useState(salarie?.actif ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload: Partial<Salarie> = {
      nom,
      prenom,
      email: email || null,
      telephone: telephone || null,
      actif,
    };

    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        alert("Le code PIN doit être composé de 4 chiffres.");
        setSaving(false);
        return;
      }
      const { data: hashed, error: hashErr } = await supabase.rpc("hash_pin", { pin });
      if (hashErr || !hashed) {
        alert("Erreur lors du hash du PIN. Vérifie que la fonction hash_pin est bien créée dans Supabase.");
        setSaving(false);
        return;
      }
      payload.pin_hash = hashed as string;
    } else if (!salarie) {
      alert("Le code PIN est obligatoire pour un nouveau salarié.");
      setSaving(false);
      return;
    }

    if (salarie) {
      await supabase.from("salaries").update(payload).eq("id", salarie.id);
    } else {
      await supabase.from("salaries").insert(payload);
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSave} className="bg-card rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">{salarie ? "Modifier le salarié" : "Nouveau salarié"}</h2>

        <div className="space-y-3">
          <Field label="Prénom" value={prenom} onChange={setPrenom} required />
          <Field label="Nom" value={nom} onChange={setNom} required />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          <Field label="Téléphone" value={telephone} onChange={setTelephone} placeholder="+352 ..." />
          <Field
            label={salarie ? "Nouveau code PIN (laisser vide pour garder l'actuel)" : "Code PIN (4 chiffres)"}
            value={pin}
            onChange={setPin}
            type="password"
            placeholder="1234"
            maxLength={4}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
            Salarié actif
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border bg-card text-sm font-semibold">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-accent text-background text-sm font-semibold disabled:opacity-50">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-foreground"
      />
    </div>
  );
}
