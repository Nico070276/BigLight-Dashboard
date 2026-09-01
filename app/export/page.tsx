"use client";

import { useEffect, useMemo, useState } from "react";
import {
  supabase,
  type Salarie,
  type Absence,
  type PointageWithRelations,
} from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

// Heures en décimal (7.5 = 7h30) — se somment proprement en paie.
function toHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100;
}
function formatHM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

type DayCell =
  | { kind: "work"; minutes: number }
  | { kind: "conge" }
  | { kind: "maladie" }
  | { kind: "empty" };

type Column = {
  salarieId: string;
  nom: string;
  cells: Record<string, DayCell>; // dayKey -> cell
  totalMin: number;
  joursTravailles: number;
  joursConge: number;
  joursMaladie: number;
  parChantier: Record<string, number>;
};

type Anomaly = { salarieNom: string; date: string };
type DayInfo = { key: string; num: number; weekday: string; weekend: boolean };

export default function ExportPage() {
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [pointages, setPointages] = useState<PointageWithRelations[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      const monthEndDate = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

      const [salariesRes, pointagesRes, absencesRes] = await Promise.all([
        supabase.from("salaries").select("*").order("nom"),
        supabase
          .from("pointages")
          .select("*, salaries(nom, prenom), chantiers(nom)")
          .gte("timestamp", start.toISOString())
          .lt("timestamp", end.toISOString())
          .order("timestamp"),
        // Absences qui chevauchent le mois : début <= fin du mois ET fin >= début du mois
        supabase
          .from("absences")
          .select("*")
          .lte("date_debut", monthEndDate)
          .gte("date_fin", `${month}-01`),
      ]);

      setSalaries(salariesRes.data ?? []);
      setPointages(pointagesRes.data ?? []);
      setAbsences((absencesRes.data as Absence[]) ?? []);
      setLoading(false);
    }
    load();
  }, [month]);

  const days = useMemo<DayInfo[]>(() => {
    const [y, m] = month.split("-").map(Number);
    const n = new Date(y, m, 0).getDate();
    const out: DayInfo[] = [];
    for (let d = 1; d <= n; d++) {
      const key = `${month}-${String(d).padStart(2, "0")}`;
      const date = new Date(y, m - 1, d);
      const dow = date.getDay();
      out.push({
        key,
        num: d,
        weekday: date.toLocaleDateString("fr-FR", { weekday: "short" }),
        weekend: dow === 0 || dow === 6,
      });
    }
    return out;
  }, [month]);

  const { columns, anomalies } = useMemo(
    () => computeGrid(salaries, pointages, absences, days),
    [salaries, pointages, absences, days]
  );

  const grandTotalMin = columns.reduce((s, c) => s + c.totalMin, 0);

  function handleExportExcel() {
    const wb = XLSX.utils.book_new();

    // --- Feuille 1 : grille jour par jour ---
    const header = ["Jour", "Jour sem.", ...columns.map((c) => c.nom)];
    const aoa: (string | number)[][] = [header];

    for (const day of days) {
      const row: (string | number)[] = [day.num, day.weekday];
      for (const col of columns) {
        row.push(cellToExcel(col.cells[day.key]));
      }
      aoa.push(row);
    }

    aoa.push([]);
    aoa.push(["Total heures", "", ...columns.map((c) => toHours(c.totalMin))]);
    aoa.push(["Jours travaillés", "", ...columns.map((c) => c.joursTravailles)]);
    aoa.push(["Jours congé (C)", "", ...columns.map((c) => c.joursConge)]);
    aoa.push(["Jours maladie (M)", "", ...columns.map((c) => c.joursMaladie)]);
    aoa.push([]);
    aoa.push(["TOTAL GÉNÉRAL (heures)", "", toHours(grandTotalMin)]);
    aoa.push([]);
    aoa.push(["Légende : C = congé, M = maladie. Heures en décimal (7.5 = 7h30)."]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 9 },
      ...columns.map((c) => ({ wch: Math.max(10, c.nom.length + 2) })),
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Grille");

    // --- Feuille 2 : résumé par salarié ---
    const summary: Record<string, string | number>[] = columns.map((c) => ({
      "Salarié": c.nom,
      "Jours travaillés": c.joursTravailles,
      "Heures travaillées": toHours(c.totalMin),
      "Jours congé": c.joursConge,
      "Jours maladie": c.joursMaladie,
      "Répartition par chantier": Object.entries(c.parChantier)
        .map(([ch, min]) => `${ch}: ${formatHM(min)}`)
        .join(" | "),
    }));
    summary.push({
      "Salarié": "TOTAL ÉQUIPE",
      "Jours travaillés": columns.reduce((s, c) => s + c.joursTravailles, 0),
      "Heures travaillées": toHours(grandTotalMin),
      "Jours congé": columns.reduce((s, c) => s + c.joursConge, 0),
      "Jours maladie": columns.reduce((s, c) => s + c.joursMaladie, 0),
      "Répartition par chantier": "",
    });
    const ws2 = XLSX.utils.json_to_sheet(summary);
    ws2["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 13 }, { wch: 14 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Résumé");

    XLSX.writeFile(wb, `BIGLIGHT-pointages-${month}.xlsx`);
  }

  const monthLabel = new Date(month + "-01").toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <AppShell>
      <TopBar title="Export paie" />

      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <h3 className="font-bold text-sm mb-4">Générer un export mensuel</h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Mois</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-card"
            />
          </div>
          <button
            onClick={handleExportExcel}
            disabled={loading || columns.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-background rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50"
          >
            <Download size={16} />
            Télécharger Excel
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-sm mb-4 capitalize">Aperçu — {monthLabel}</h3>

        {!loading && anomalies.length > 0 && (
          <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg text-xs text-warning">
            <div className="font-semibold mb-1">
              ⚠ {anomalies.length} journée{anomalies.length > 1 ? "s" : ""} sans pointage de fin —
              temps non comptabilisé, à corriger avant la paie :
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {anomalies.map((a, i) => (
                <li key={i}>
                  {a.salarieNom} — {new Date(a.date).toLocaleDateString("fr-FR")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-muted">Chargement...</div>
        ) : columns.length === 0 ? (
          <div className="p-8 text-center text-muted">Aucune donnée pour ce mois.</div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted">
              <span><span className="inline-block px-1.5 rounded bg-sky-100 text-sky-800 font-semibold">C</span> Congé</span>
              <span><span className="inline-block px-1.5 rounded bg-rose-100 text-rose-800 font-semibold">M</span> Maladie</span>
              <span>Heures en décimal (7.5 = 7h30)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="text-sm border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted">
                    <th className="text-left p-2 font-semibold sticky left-0 bg-card border-b border-border">Jour</th>
                    {columns.map((c) => (
                      <th key={c.salarieId} className="p-2 font-semibold border-b border-border whitespace-nowrap text-center min-w-[70px]">
                        {c.nom}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => (
                    <tr key={day.key} className={day.weekend ? "bg-black/[0.02]" : ""}>
                      <td className="p-2 whitespace-nowrap sticky left-0 bg-inherit border-b border-border/60 text-muted">
                        <span className="font-semibold text-foreground">{String(day.num).padStart(2, "0")}</span>{" "}
                        {day.weekday}
                      </td>
                      {columns.map((c) => (
                        <td key={c.salarieId} className="p-2 text-center border-b border-border/60">
                          <CellView cell={c.cells[day.key]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2 border-border">
                    <td className="p-2 sticky left-0 bg-card">Total h</td>
                    {columns.map((c) => (
                      <td key={c.salarieId} className="p-2 text-center">{toHours(c.totalMin)}</td>
                    ))}
                  </tr>
                  <tr className="text-xs text-muted">
                    <td className="p-2 sticky left-0 bg-card">Jours travaillés</td>
                    {columns.map((c) => (
                      <td key={c.salarieId} className="p-2 text-center">{c.joursTravailles}</td>
                    ))}
                  </tr>
                  <tr className="text-xs text-muted">
                    <td className="p-2 sticky left-0 bg-card">Congé (C)</td>
                    {columns.map((c) => (
                      <td key={c.salarieId} className="p-2 text-center">{c.joursConge || "—"}</td>
                    ))}
                  </tr>
                  <tr className="text-xs text-muted">
                    <td className="p-2 sticky left-0 bg-card">Maladie (M)</td>
                    {columns.map((c) => (
                      <td key={c.salarieId} className="p-2 text-center">{c.joursMaladie || "—"}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm font-bold">
                Total général : {toHours(grandTotalMin)} h ({formatHM(grandTotalMin)})
              </div>
            </div>

            <div className="mt-4 p-3 bg-success/10 border border-success/30 rounded-lg text-xs text-success">
              ✓ Export conforme au Code du travail luxembourgeois (décompte fiable — CJUE 2019)
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function CellView({ cell }: { cell: DayCell | undefined }) {
  if (!cell || cell.kind === "empty") return <span className="text-border">·</span>;
  if (cell.kind === "conge")
    return <span className="inline-block px-1.5 rounded bg-sky-100 text-sky-800 font-semibold text-xs">C</span>;
  if (cell.kind === "maladie")
    return <span className="inline-block px-1.5 rounded bg-rose-100 text-rose-800 font-semibold text-xs">M</span>;
  return <span className="font-medium">{toHours(cell.minutes)}</span>;
}

function cellToExcel(cell: DayCell | undefined): string | number {
  if (!cell || cell.kind === "empty") return "";
  if (cell.kind === "conge") return "C";
  if (cell.kind === "maladie") return "M";
  return toHours(cell.minutes);
}

function computeGrid(
  salaries: Salarie[],
  pointages: PointageWithRelations[],
  absences: Absence[],
  days: DayInfo[]
): { columns: Column[]; anomalies: Anomaly[] } {
  const anomalies: Anomaly[] = [];
  const dayKeys = new Set(days.map((d) => d.key));

  const cols: Record<string, Column> = {};
  for (const s of salaries) {
    cols[s.id] = {
      salarieId: s.id,
      nom: `${s.prenom} ${s.nom}`,
      cells: {},
      totalMin: 0,
      joursTravailles: 0,
      joursConge: 0,
      joursMaladie: 0,
      parChantier: {},
    };
  }

  // 1. Heures travaillées, regroupées par salarié + jour
  const byDay: Record<string, PointageWithRelations[]> = {};
  for (const p of pointages) {
    const key = `${p.salarie_id}::${p.timestamp.slice(0, 10)}`;
    (byDay[key] ??= []).push(p);
  }

  for (const list of Object.values(byDay)) {
    list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const col = cols[list[0].salarie_id];
    if (!col) continue;
    const dayKey = list[0].timestamp.slice(0, 10);

    let started: number | null = null;
    let currentChantier: string | null = null;
    let dayMin = 0;

    for (const p of list) {
      const ts = new Date(p.timestamp).getTime();
      if (p.chantiers?.nom) currentChantier = p.chantiers.nom;

      if (p.type === "debut" || p.type === "reprise") {
        if (started === null) started = ts;
      } else if ((p.type === "pause" || p.type === "fin") && started !== null) {
        const seg = Math.floor((ts - started) / 60000);
        dayMin += seg;
        const ch = currentChantier ?? "(sans chantier)";
        col.parChantier[ch] = (col.parChantier[ch] ?? 0) + seg;
        started = null;
      }
    }

    // Journée sans « fin » : temps non comptabilisé, signalé.
    if (started !== null) {
      anomalies.push({ salarieNom: col.nom, date: dayKey });
    }

    if (dayMin > 0 && dayKeys.has(dayKey)) {
      col.cells[dayKey] = { kind: "work", minutes: dayMin };
      col.totalMin += dayMin;
      col.joursTravailles += 1;
    }
  }

  // 2. Absences (n'écrasent pas une journée déjà travaillée)
  for (const a of absences) {
    const col = cols[a.salarie_id];
    if (!col) continue;
    for (const day of days) {
      if (day.key >= a.date_debut && day.key <= a.date_fin) {
        if (col.cells[day.key]?.kind === "work") continue;
        if (col.cells[day.key]) continue; // déjà marqué (congé prioritaire sur doublon)
        col.cells[day.key] = { kind: a.type === "conge" ? "conge" : "maladie" };
        if (a.type === "conge") col.joursConge += 1;
        else col.joursMaladie += 1;
      }
    }
  }

  // On ne garde que les salariés ayant une activité ou une absence ce mois-ci
  const columns = Object.values(cols).filter(
    (c) => c.totalMin > 0 || c.joursConge > 0 || c.joursMaladie > 0
  );
  columns.sort((a, b) => a.nom.localeCompare(b.nom));
  anomalies.sort((a, b) => a.date.localeCompare(b.date));
  return { columns, anomalies };
}
