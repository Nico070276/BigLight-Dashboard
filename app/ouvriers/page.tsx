"use client";

import { useEffect, useState } from "react";
import { supabase, type Ouvrier } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function OuvriersPage() {
  const [ouvriers, setOuvriers] = useState<Ouvrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Ouvrier | null>(null);

  async function loadOuvriers() {
    setLoading(true);
    const { data } = await supabase.from("ouvriers").select("*").order("nom");
    setOuvriers(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOuvriers();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet ouvrier ? Ses pointages seront aussi supprimés.")) return;
    await supabase.from("ouvriers").delete().eq("id", id);
    await loadOuvriers();
  }

  function handleEdit(o: Ouvrier) {
    setEditing(o);
    setShowModal(true);
  }

  function handleAdd() {
    setEditing(null);
    setShowModal(true);
  }

  return (
    <AppShell>
      <TopBar title="Ouvriers">
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg text-sm font-semibold hover:bg-black"
        >
          <Plus size={16} />
          Ajouter un ouvrier
        </button>
      </TopBar>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted">Chargement...</div>
      ) : ouvriers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted">
          Aucun ouvrier enregistré. Cliquez sur &quot;Ajouter un ouvrier&quot; pour commencer.
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
                {ouvriers.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="p-3">
                      <div className="font-semibold">{o.prenom} {o.nom}</div>
                      {o.email && <div className="text-xs text-muted">{o.email}</div>}
                    </td>
                    <td className="p-3">
                      <code className="bg-black/5 px-2 py-0.5 rounded text-xs">••••</code>
                    </td>
                    <td className="p-3">{o.telephone ?? "—"}</td>
                    <td className="p-3">
                      {o.actif ? (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">● Actif</span>
                      ) : (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Inactif</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleEdit(o)} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-white hover:bg-black/5 mr-1" title="Modifier">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(o.id)} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-white hover:bg-red-50 text-danger" title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {ouvriers.map((o) => (
              <div key={o.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{o.prenom} {o.nom}</div>
                    {o.email && <div className="text-xs text-muted mt-0.5 truncate">{o.email}</div>}
                    {o.telephone && <div className="text-xs text-muted mt-0.5">{o.telephone}</div>}
                  </div>
                  {o.actif ? (
                    <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-800">● Actif</span>
                  ) : (
                    <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">Inactif</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <code className="bg-black/5 px-2 py-0.5 rounded text-xs">PIN ••••</code>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(o)} className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-border bg-white" title="Modifier">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(o.id)} className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-border bg-white text-danger" title="Supprimer">
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
        <OuvrierModal
          ouvrier={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            loadOuvriers();
          }}
        />
      )}
    </AppShell>
  );
}

function OuvrierModal({
  ouvrier,
  onClose,
  onSaved,
}: {
  ouvrier: Ouvrier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nom, setNom] = useState(ouvrier?.nom ?? "");
  const [prenom, setPrenom] = useState(ouvrier?.prenom ?? "");
  const [email, setEmail] = useState(ouvrier?.email ?? "");
  const [telephone, setTelephone] = useState(ouvrier?.telephone ?? "");
  const [pin, setPin] = useState("");
  const [actif, setActif] = useState(ouvrier?.actif ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload: Partial<Ouvrier> = {
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
    } else if (!ouvrier) {
      alert("Le code PIN est obligatoire pour un nouvel ouvrier.");
      setSaving(false);
      return;
    }

    if (ouvrier) {
      await supabase.from("ouvriers").update(payload).eq("id", ouvrier.id);
    } else {
      await supabase.from("ouvriers").insert(payload);
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSave} className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">{ouvrier ? "Modifier l'ouvrier" : "Nouvel ouvrier"}</h2>

        <div className="space-y-3">
          <Field label="Prénom" value={prenom} onChange={setPrenom} required />
          <Field label="Nom" value={nom} onChange={setNom} required />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          <Field label="Téléphone" value={telephone} onChange={setTelephone} placeholder="+352 ..." />
          <Field
            label={ouvrier ? "Nouveau code PIN (laisser vide pour garder l'actuel)" : "Code PIN (4 chiffres)"}
            value={pin}
            onChange={setPin}
            type="password"
            placeholder="1234"
            maxLength={4}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
            Ouvrier actif
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border bg-white text-sm font-semibold">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#1a1a1a] text-white text-sm font-semibold disabled:opacity-50">
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
