"use client";

import { useEffect, useMemo, useState } from "react";
import {
  supabase,
  type Chantier,
  type Pointage,
  type PointageWithRelations,
} from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { MapPin, Pencil, Plus, Trash2, X } from "lucide-react";

type PType = Pointage["type"];

type GpsPoint = {
  type: PType;
  time: string;
  lat: number;
  lng: number;
  accuracy: number | null;
};

const TYPE_LABEL: Record<PType, string> = {
  debut: "Début",
  pause: "Pause",
  reprise: "Reprise",
  fin: "Fin",
};

const TYPES: PType[] = ["debut", "pause", "reprise", "fin"];

type Journee = {
  date: string;
  salarieId: string;
  salarieNom: string;
  chantier: string;
  debut: string | null;
  fin: string | null;
  pauseMin: number;
  totalMin: number;
  gpsPoints: GpsPoint[];
  manuel: boolean;
  raw: PointageWithRelations[];
};

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ISO -> valeur d'un <input type="datetime-local"> en heure locale
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PointagesPage() {
  const [pointages, setPointages] = useState<PointageWithRelations[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>("");
  const [editing, setEditing] = useState<Journee | null>(null);

  async function loadPointages() {
    setLoading(true);
    let query = supabase
      .from("pointages")
      .select("*, salaries(nom, prenom), chantiers(nom)")
      .order("timestamp", { ascending: false })
      .limit(500);

    if (dateFilter) {
      const d = new Date(dateFilter);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      query = query.gte("timestamp", d.toISOString()).lt("timestamp", next.toISOString());
    }

    const { data } = await query;
    setPointages(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadPointages();
  }, [dateFilter]);

  useEffect(() => {
    supabase
      .from("chantiers")
      .select("*")
      .order("nom")
      .then(({ data }) => setChantiers(data ?? []));
  }, []);

  const journees = groupByJournee(pointages);

  return (
    <AppShell>
      <TopBar title="Pointages">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border border-border bg-card rounded-lg text-sm"
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter("")}
            className="px-3 py-2 border border-border bg-card rounded-lg text-sm font-semibold"
          >
            Effacer
          </button>
        )}
      </TopBar>

      {loading ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted">Chargement...</div>
      ) : journees.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted">Aucun pointage pour cette période.</div>
      ) : (
        <>
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black/[0.02] text-xs uppercase tracking-wider text-muted">
                  <th className="text-left p-3 font-semibold">Date</th>
                  <th className="text-left p-3 font-semibold">Salarié</th>
                  <th className="text-left p-3 font-semibold">Chantier</th>
                  <th className="text-left p-3 font-semibold">Début</th>
                  <th className="text-left p-3 font-semibold">Pause</th>
                  <th className="text-left p-3 font-semibold">Fin</th>
                  <th className="text-left p-3 font-semibold">Total</th>
                  <th className="text-left p-3 font-semibold">GPS</th>
                  <th className="text-right p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {journees.map((j, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-3">{new Date(j.date).toLocaleDateString("fr-FR")}</td>
                    <td className="p-3 font-semibold">
                      {j.salarieNom}
                      {j.manuel && (
                        <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-info/15 text-info" title="Journée contenant une correction manuelle">
                          corrigé
                        </span>
                      )}
                    </td>
                    <td className="p-3">{j.chantier}</td>
                    <td className="p-3">{j.debut ?? "—"}</td>
                    <td className="p-3">{j.pauseMin > 0 ? `${j.pauseMin} min` : "—"}</td>
                    <td className="p-3">
                      {j.fin ?? <span className="text-warning font-semibold" title="Pointage de fin manquant">⚠ manquant</span>}
                    </td>
                    <td className="p-3 font-semibold">{formatDuration(j.totalMin)}</td>
                    <td className="p-3">
                      {j.gpsPoints.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {j.gpsPoints.map((g, k) => (
                            <a
                              key={k}
                              href={mapsUrl(g.lat, g.lng)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`${TYPE_LABEL[g.type]} · ${g.time}${g.accuracy ? ` · ±${Math.round(g.accuracy)}m` : ""}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-border bg-card text-xs hover:bg-white/5"
                            >
                              <MapPin size={11} />
                              {TYPE_LABEL[g.type]}
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setEditing(j)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-white/5"
                        title="Corriger cette journée"
                      >
                        <Pencil size={13} />
                        Corriger
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {journees.map((j, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">
                      {j.salarieNom}
                      {j.manuel && (
                        <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-info/15 text-info">
                          corrigé
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted mt-0.5 truncate">{j.chantier}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-muted">{new Date(j.date).toLocaleDateString("fr-FR")}</div>
                    <div className="font-semibold mt-0.5">{formatDuration(j.totalMin)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div>
                    <div className="text-muted">Début</div>
                    <div className="font-medium">{j.debut ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted">Pause</div>
                    <div className="font-medium">{j.pauseMin > 0 ? `${j.pauseMin} min` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted">Fin</div>
                    <div className="font-medium">
                      {j.fin ?? <span className="text-warning font-semibold">⚠</span>}
                    </div>
                  </div>
                </div>
                {j.gpsPoints.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {j.gpsPoints.map((g, k) => (
                      <a
                        key={k}
                        href={mapsUrl(g.lat, g.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={g.accuracy ? `±${Math.round(g.accuracy)}m` : undefined}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-card text-xs"
                      >
                        <MapPin size={12} />
                        {TYPE_LABEL[g.type]} · {g.time}
                      </a>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setEditing(j)}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-xs font-semibold"
                >
                  <Pencil size={13} />
                  Corriger
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <JourneeEditModal
          journee={editing}
          chantiers={chantiers}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadPointages();
          }}
        />
      )}
    </AppShell>
  );
}

// ------------------------------------------------------------
// Modal de correction : édite les événements bruts d'une journée
// ------------------------------------------------------------
type DraftEvent = {
  key: string;
  id: string | null; // null = nouvel événement
  type: PType;
  datetime: string; // valeur datetime-local
  chantierId: string | null;
};

type AuditRow = {
  id: string;
  action: "insert" | "update" | "delete";
  source: "worker" | "admin";
  changed_at: string;
  old_data: { type?: PType } | null;
  new_data: { type?: PType } | null;
};

const AUDIT_ACTION_LABEL: Record<AuditRow["action"], string> = {
  insert: "Ajout",
  update: "Modification",
  delete: "Suppression",
};

function JourneeEditModal({
  journee,
  chantiers,
  onClose,
  onSaved,
}: {
  journee: Journee;
  chantiers: Chantier[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const original = useMemo(
    () => new Map(journee.raw.map((p) => [p.id, p])),
    [journee]
  );
  const [drafts, setDrafts] = useState<DraftEvent[]>(() =>
    journee.raw.map((p) => ({
      key: p.id,
      id: p.id,
      type: p.type,
      datetime: toLocalInput(p.timestamp),
      chantierId: p.chantier_id,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<AuditRow[]>([]);

  useEffect(() => {
    const start = new Date(`${journee.date}T00:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    supabase
      .from("pointages_audit")
      .select("id, action, source, changed_at, old_data, new_data")
      .eq("salarie_id", journee.salarieId)
      .gte("pointage_ts", start.toISOString())
      .lt("pointage_ts", end.toISOString())
      .order("changed_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setHistory((data as AuditRow[]) ?? []))
      // Table d'audit pas encore déployée : on ignore silencieusement.
      .then(undefined, () => setHistory([]));
  }, [journee]);

  function update(key: string, patch: Partial<DraftEvent>) {
    setDrafts((d) => d.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  }
  function remove(key: string) {
    setDrafts((d) => d.filter((e) => e.key !== key));
  }
  function addRow() {
    setDrafts((d) => [
      ...d,
      {
        key: `new-${Date.now()}-${d.length}`,
        id: null,
        type: "fin",
        datetime: `${journee.date}T17:00`,
        chantierId: journee.raw[0]?.chantier_id ?? null,
      },
    ]);
  }

  async function save() {
    if (drafts.some((d) => !d.datetime)) {
      alert("Chaque pointage doit avoir une date et une heure.");
      return;
    }
    setSaving(true);
    try {
      // Toutes les corrections d'une journée partent en UNE seule transaction
      // (RPC admin_save_journee) : c'est tout ou rien. Fini les enregistrements
      // partiels où il fallait ressaisir la modification.
      const keptIds = new Set(
        drafts.filter((d) => d.id).map((d) => d.id as string)
      );
      const deletedIds = [...original.keys()].filter((id) => !keptIds.has(id));
      const events = drafts.map((d) => ({
        id: d.id,
        type: d.type,
        chantier_id: d.chantierId,
        ts: new Date(d.datetime).toISOString(),
      }));

      const { error } = await supabase.rpc("admin_save_journee", {
        p_salarie_id: journee.salarieId,
        p_deleted_ids: deletedIds,
        p_events: events,
      });
      if (error) throw error;
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Erreur lors de l'enregistrement des corrections.\n${msg}`);
      setSaving(false);
    }
  }

  const sorted = [...drafts].sort((a, b) => a.datetime.localeCompare(b.datetime));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Corriger la journée</h2>
            <p className="text-xs text-muted mt-0.5">
              {journee.salarieNom} · {new Date(journee.date).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-2">
          {sorted.length === 0 && (
            <p className="text-sm text-muted text-center py-4">
              Aucun pointage. Ajoutez-en un ci-dessous.
            </p>
          )}
          {sorted.map((d) => (
            <div key={d.key} className="flex flex-wrap items-center gap-2 p-2 border border-border rounded-lg">
              <select
                value={d.type}
                onChange={(e) => update(d.key, { type: e.target.value as PType })}
                className="px-2 py-1.5 border border-border rounded-lg text-sm bg-card"
              >
                {TYPES.map((tp) => (
                  <option key={tp} value={tp}>{TYPE_LABEL[tp]}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={d.datetime}
                onChange={(e) => update(d.key, { datetime: e.target.value })}
                className="px-2 py-1.5 border border-border rounded-lg text-sm bg-card"
              />
              <select
                value={d.chantierId ?? ""}
                onChange={(e) => update(d.key, { chantierId: e.target.value || null })}
                className="px-2 py-1.5 border border-border rounded-lg text-sm bg-card min-w-0 flex-1"
              >
                <option value="">(sans chantier)</option>
                {chantiers.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
              {d.id === null && (
                <span className="text-[10px] uppercase font-semibold text-info bg-info/15 px-1.5 py-0.5 rounded">
                  Ajout
                </span>
              )}
              <button
                onClick={() => remove(d.key)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-danger/10 text-danger"
                title="Supprimer ce pointage"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <button
            onClick={addRow}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-sm font-semibold hover:bg-white/5"
          >
            <Plus size={15} />
            Ajouter un pointage
          </button>

          <p className="text-xs text-muted pt-2">
            Les corrections manuelles ne comportent pas de position GPS.
          </p>

          {history.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Historique des modifications
              </h3>
              <ul className="space-y-1.5">
                {history.map((h) => {
                  const tp = h.new_data?.type ?? h.old_data?.type;
                  return (
                    <li key={h.id} className="flex items-center gap-2 text-xs">
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          h.source === "admin" ? "bg-info/15 text-info" : "bg-white/10 text-muted"
                        }`}
                      >
                        {h.source === "admin" ? "Manuel" : "App"}
                      </span>
                      <span className="font-medium">
                        {AUDIT_ACTION_LABEL[h.action]}
                        {tp ? ` · ${TYPE_LABEL[tp]}` : ""}
                      </span>
                      <span className="text-muted ml-auto">
                        {new Date(h.changed_at).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border bg-card text-sm font-semibold">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-accent text-background text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer les corrections"}
          </button>
        </div>
      </div>
    </div>
  );
}

function groupByJournee(pointages: PointageWithRelations[]): Journee[] {
  const map: Record<string, PointageWithRelations[]> = {};
  for (const p of pointages) {
    const day = p.timestamp.slice(0, 10);
    const key = `${p.salarie_id}-${day}`;
    (map[key] ??= []).push(p);
  }

  const result: Journee[] = [];
  for (const [, list] of Object.entries(map)) {
    list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const first = list[0];
    const salarieNom = first.salaries ? `${first.salaries.prenom} ${first.salaries.nom}` : "—";
    const chantier = first.chantiers?.nom ?? "—";
    const debut = list.find((p) => p.type === "debut");
    const fin = list.slice().reverse().find((p) => p.type === "fin");

    let totalMs = 0;
    let pauseMs = 0;
    let started: number | null = null;
    let pauseStart: number | null = null;

    for (const p of list) {
      const ts = new Date(p.timestamp).getTime();
      if (p.type === "debut") started = ts;
      else if (p.type === "pause") {
        if (started !== null) { totalMs += ts - started; started = null; }
        pauseStart = ts;
      } else if (p.type === "reprise") {
        if (pauseStart !== null) { pauseMs += ts - pauseStart; pauseStart = null; }
        started = ts;
      } else if (p.type === "fin") {
        if (started !== null) { totalMs += ts - started; started = null; }
      }
    }

    const gpsPoints: GpsPoint[] = list
      .filter((p) => p.latitude !== null && p.longitude !== null)
      .map((p) => ({
        type: p.type,
        time: formatTime(p.timestamp),
        lat: p.latitude as number,
        lng: p.longitude as number,
        accuracy: p.gps_accuracy ?? null,
      }));

    result.push({
      date: first.timestamp.slice(0, 10),
      salarieId: first.salarie_id,
      salarieNom,
      chantier,
      debut: debut ? formatTime(debut.timestamp) : null,
      fin: fin ? formatTime(fin.timestamp) : null,
      pauseMin: Math.floor(pauseMs / 60000),
      totalMin: Math.floor(totalMs / 60000),
      gpsPoints,
      manuel: list.some((p) => p.manuel),
      raw: list,
    });
  }

  return result.sort((a, b) => b.date.localeCompare(a.date) || a.salarieNom.localeCompare(b.salarieNom));
}
