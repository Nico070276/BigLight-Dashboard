"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  type Ouvrier,
  type Absence,
  type AbsenceWithRelations,
} from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { Plus, Pencil, Trash2, Plane, HeartPulse } from "lucide-react";

const TYPE_LABEL: Record<Absence["type"], string> = {
  conge: "Congé",
  maladie: "Maladie",
};

function nbJours(debut: string, fin: string) {
  const d = new Date(debut);
  const f = new Date(fin);
  return Math.floor((f.getTime() - d.getTime()) / 86400000) + 1;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AbsencesPage() {
  const [absences, setAbsences] = useState<AbsenceWithRelations[]>([]);
  const [ouvriers, setOuvriers] = useState<Ouvrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AbsenceWithRelations | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("absences")
      .select("*, ouvriers(nom, prenom)")
      .order("date_debut", { ascending: false });
    setAbsences((data as AbsenceWithRelations[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    supabase
      .from("ouvriers")
      .select("*")
      .eq("actif", true)
      .order("nom")
      .then(({ data }) => setOuvriers(data ?? []));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette absence ?")) return;
    await supabase.from("absences").delete().eq("id", id);
    await load();
  }

  return (
    <AppShell>
      <TopBar title="Congés / Maladie">
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg text-sm font-semibold hover:bg-black"
        >
          <Plus size={16} />
          Ajouter une absence
        </button>
      </TopBar>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted">Chargement...</div>
      ) : absences.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted">
          Aucune absence enregistrée. Les congés et jours de maladie saisis ici apparaîtront automatiquement dans l&apos;export mensuel.
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black/[0.02] text-xs uppercase tracking-wider text-muted">
                  <th className="text-left p-3 font-semibold">Ouvrier</th>
                  <th className="text-left p-3 font-semibold">Type</th>
                  <th className="text-left p-3 font-semibold">Du</th>
                  <th className="text-left p-3 font-semibold">Au</th>
                  <th className="text-left p-3 font-semibold">Jours</th>
                  <th className="text-left p-3 font-semibold">Note</th>
                  <th className="text-right p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {absences.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="p-3 font-semibold">
                      {a.ouvriers ? `${a.ouvriers.prenom} ${a.ouvriers.nom}` : "—"}
                    </td>
                    <td className="p-3">
                      <TypeBadge type={a.type} />
                    </td>
                    <td className="p-3">{formatDate(a.date_debut)}</td>
                    <td className="p-3">{formatDate(a.date_fin)}</td>
                    <td className="p-3">{nbJours(a.date_debut, a.date_fin)}</td>
                    <td className="p-3 text-muted text-xs max-w-[220px] truncate">{a.note ?? "—"}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditing(a);
                          setShowModal(true);
                        }}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-white hover:bg-black/5 mr-1"
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-white hover:bg-red-50 text-danger"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {absences.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">
                      {a.ouvriers ? `${a.ouvriers.prenom} ${a.ouvriers.nom}` : "—"}
                    </div>
                    <div className="mt-1">
                      <TypeBadge type={a.type} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted">
                    {nbJours(a.date_debut, a.date_fin)} jour(s)
                  </div>
                </div>
                <div className="text-xs text-muted mt-2">
                  Du {formatDate(a.date_debut)} au {formatDate(a.date_fin)}
                </div>
                {a.note && <div className="text-xs text-muted mt-1">{a.note}</div>}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setEditing(a);
                      setShowModal(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white text-xs font-semibold"
                  >
                    <Pencil size={13} /> Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="w-10 inline-flex items-center justify-center rounded-lg border border-border bg-white text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <AbsenceModal
          absence={editing}
          ouvriers={ouvriers}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
    </AppShell>
  );
}

function TypeBadge({ type }: { type: Absence["type"] }) {
  return type === "conge" ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
      <Plane size={12} /> Congé
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
      <HeartPulse size={12} /> Maladie
    </span>
  );
}

function AbsenceModal({
  absence,
  ouvriers,
  onClose,
  onSaved,
}: {
  absence: AbsenceWithRelations | null;
  ouvriers: Ouvrier[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [ouvrierId, setOuvrierId] = useState(absence?.ouvrier_id ?? "");
  const [type, setType] = useState<Absence["type"]>(absence?.type ?? "conge");
  const [dateDebut, setDateDebut] = useState(absence?.date_debut ?? "");
  const [dateFin, setDateFin] = useState(absence?.date_fin ?? "");
  const [note, setNote] = useState(absence?.note ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!ouvrierId) {
      alert("Sélectionnez un ouvrier.");
      return;
    }
    if (!dateDebut || !dateFin) {
      alert("Indiquez une date de début et de fin.");
      return;
    }
    if (dateFin < dateDebut) {
      alert("La date de fin doit être postérieure ou égale à la date de début.");
      return;
    }
    setSaving(true);
    const payload = {
      ouvrier_id: ouvrierId,
      type,
      date_debut: dateDebut,
      date_fin: dateFin,
      note: note.trim() || null,
    };
    const { error } = absence
      ? await supabase.from("absences").update(payload).eq("id", absence.id)
      : await supabase.from("absences").insert(payload);

    if (error) {
      alert(`Erreur lors de l'enregistrement.\n${error.message}`);
      setSaving(false);
      return;
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSave} className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">
          {absence ? "Modifier l'absence" : "Nouvelle absence"}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Ouvrier</label>
            <select
              value={ouvrierId}
              onChange={(e) => setOuvrierId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
            >
              <option value="">Sélectionner…</option>
              {ouvriers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.prenom} {o.nom}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Type</label>
            <div className="flex gap-2">
              {(["conge", "maladie"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border ${
                    type === t
                      ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                      : "bg-white border-border text-muted"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Du</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => {
                  setDateDebut(e.target.value);
                  if (!dateFin || dateFin < e.target.value) setDateFin(e.target.value);
                }}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Au</label>
              <input
                type="date"
                value={dateFin}
                min={dateDebut || undefined}
                onChange={(e) => setDateFin(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Note (facultatif)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex. certificat médical reçu"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border bg-white text-sm font-semibold"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#1a1a1a] text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
