"use client";

import { useEffect, useState } from "react";
import { supabase, type Chantier } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { Plus, Pencil, Trash2 } from "lucide-react";

const STATUT_LABEL = {
  actif: { bg: "bg-success/15", text: "text-success", label: "Actif" },
  demarrage: { bg: "bg-warning/15", text: "text-warning", label: "En démarrage" },
  termine: { bg: "bg-white/10", text: "text-muted", label: "Terminé" },
};

export default function ChantiersPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Chantier | null>(null);

  async function loadChantiers() {
    setLoading(true);
    const { data } = await supabase.from("chantiers").select("*").order("created_at", { ascending: false });
    setChantiers(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadChantiers();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce chantier ?")) return;
    await supabase.from("chantiers").delete().eq("id", id);
    await loadChantiers();
  }

  return (
    <AppShell>
      <TopBar title="Chantiers">
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-background rounded-lg text-sm font-semibold hover:opacity-90"
        >
          <Plus size={16} />
          Nouveau chantier
        </button>
      </TopBar>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted">Chargement...</div>
      ) : chantiers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted">Aucun chantier.</div>
      ) : (
        <>
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black/[0.02] text-xs uppercase tracking-wider text-muted">
                  <th className="text-left p-3 font-semibold">Nom</th>
                  <th className="text-left p-3 font-semibold">Adresse</th>
                  <th className="text-left p-3 font-semibold">Début</th>
                  <th className="text-left p-3 font-semibold">Statut</th>
                  <th className="text-right p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {chantiers.map((c) => {
                  const tag = STATUT_LABEL[c.statut];
                  return (
                    <tr key={c.id} className="border-t border-border">
                      <td className="p-3 font-semibold">{c.nom}</td>
                      <td className="p-3 text-muted">{c.adresse ?? "—"}</td>
                      <td className="p-3">
                        {c.date_debut ? new Date(c.date_debut).toLocaleDateString("fr-FR") : "—"}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${tag.bg} ${tag.text}`}>
                          {tag.label}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => { setEditing(c); setShowModal(true); }} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-white/5 mr-1">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-danger/10 text-danger">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {chantiers.map((c) => {
              const tag = STATUT_LABEL[c.statut];
              return (
                <div key={c.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{c.nom}</div>
                      {c.adresse && <div className="text-xs text-muted mt-0.5 truncate">{c.adresse}</div>}
                    </div>
                    <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${tag.bg} ${tag.text}`}>
                      {tag.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-xs text-muted">
                      {c.date_debut ? `Début ${new Date(c.date_debut).toLocaleDateString("fr-FR")}` : "—"}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(c); setShowModal(true); }} className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-border bg-card">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-border bg-card text-danger">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showModal && (
        <ChantierModal
          chantier={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadChantiers(); }}
        />
      )}
    </AppShell>
  );
}

function ChantierModal({
  chantier,
  onClose,
  onSaved,
}: {
  chantier: Chantier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nom, setNom] = useState(chantier?.nom ?? "");
  const [adresse, setAdresse] = useState(chantier?.adresse ?? "");
  const [statut, setStatut] = useState<Chantier["statut"]>(chantier?.statut ?? "actif");
  const [dateDebut, setDateDebut] = useState(chantier?.date_debut ?? "");
  const [dateFin, setDateFin] = useState(chantier?.date_fin ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      nom,
      adresse: adresse || null,
      statut,
      date_debut: dateDebut || null,
      date_fin: dateFin || null,
    };

    if (chantier) {
      await supabase.from("chantiers").update(payload).eq("id", chantier.id);
    } else {
      await supabase.from("chantiers").insert(payload);
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSave} className="bg-card rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">{chantier ? "Modifier le chantier" : "Nouveau chantier"}</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Nom du chantier</label>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Adresse</label>
            <input
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Statut</label>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value as Chantier["statut"])}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-foreground bg-card"
            >
              <option value="actif">Actif</option>
              <option value="demarrage">En démarrage</option>
              <option value="termine">Terminé</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Date de début</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Date de fin</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-foreground"
              />
            </div>
          </div>
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
