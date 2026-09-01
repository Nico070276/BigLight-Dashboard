"use client";

import { useEffect, useState } from "react";
import { supabase, type Salarie, type Chantier, type PointageWithRelations } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { RefreshCw } from "lucide-react";

type WorkerStatus = {
  salarie: Salarie;
  statut: "travail" | "pause" | "hors-ligne";
  chantier: string | null;
  debut: string | null;
  dureeMin: number;
};

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${String(m).padStart(2, "0")}min`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function DashboardPage() {
  const [salaries, setSalaries] = useState<Salarie[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [pointagesJour, setPointagesJour] = useState<PointageWithRelations[]>([]);
  const [pointagesMois, setPointagesMois] = useState<PointageWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [salariesRes, chantiersRes, jourRes, moisRes] = await Promise.all([
      supabase.from("salaries").select("*").eq("actif", true).order("nom"),
      supabase.from("chantiers").select("*").in("statut", ["actif", "demarrage"]),
      supabase
        .from("pointages")
        .select("*, salaries(nom, prenom), chantiers(nom)")
        .gte("timestamp", today.toISOString())
        .order("timestamp", { ascending: true }),
      supabase
        .from("pointages")
        .select("*, salaries(nom, prenom), chantiers(nom)")
        .gte("timestamp", monthStart.toISOString())
        .order("timestamp", { ascending: true }),
    ]);

    setSalaries(salariesRes.data ?? []);
    setChantiers(chantiersRes.data ?? []);
    setPointagesJour(jourRes.data ?? []);
    setPointagesMois(moisRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const workerStatuses: WorkerStatus[] = salaries.map((s) => {
    const pointages = pointagesJour.filter((p) => p.salarie_id === s.id);
    const last = pointages[pointages.length - 1];

    if (!last || last.type === "fin") {
      return { salarie: s, statut: "hors-ligne", chantier: null, debut: null, dureeMin: 0 };
    }

    // Début de la session EN COURS = dernier "debut" du jour (un salarié
    // peut avoir clôturé puis redémarré une nouvelle session le même jour).
    const premier = [...pointages].reverse().find((p) => p.type === "debut");
    const debutTs = premier ? new Date(premier.timestamp).getTime() : Date.now();
    const dureeMin = Math.floor((Date.now() - debutTs) / 60000);
    const chantier = pointages.find((p) => p.chantiers)?.chantiers?.nom ?? null;

    return {
      salarie: s,
      statut: last.type === "pause" ? "pause" : "travail",
      chantier,
      debut: premier ? formatTime(premier.timestamp) : null,
      dureeMin,
    };
  });

  const enTravail = workerStatuses.filter((w) => w.statut !== "hors-ligne").length;

  const totalMinMois = calcTotalMinutes(pointagesMois);
  const totalMinSemaine = calcTotalMinutesSemaine(pointagesMois);

  return (
    <AppShell>
      <TopBar title="Tableau de bord">
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-white/5"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </TopBar>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard label="Salariés au travail" value={`${enTravail} / ${salaries.length}`} trend="● En ligne maintenant" />
        <StatCard label="Heures cette semaine" value={formatDuration(totalMinSemaine)} trend="Semaine en cours" />
        <StatCard label="Heures ce mois" value={formatDuration(totalMinMois)} trend={new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })} />
        <StatCard label="Chantiers actifs" value={String(chantiers.length)} trend="Actifs / en démarrage" />
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold text-sm mb-4">Activité en direct — aujourd&apos;hui</h3>
        {workerStatuses.length === 0 ? (
          <EmptyState message="Aucun salarié enregistré. Ajoutez-en dans l'onglet Salariés." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black/[0.02] text-xs uppercase tracking-wider text-muted">
                <th className="text-left p-3 font-semibold">Salarié</th>
                <th className="text-left p-3 font-semibold">Statut</th>
                <th className="text-left p-3 font-semibold">Chantier</th>
                <th className="text-left p-3 font-semibold">Début</th>
                <th className="text-left p-3 font-semibold">Durée</th>
              </tr>
            </thead>
            <tbody>
              {workerStatuses.map((w) => (
                <tr key={w.salarie.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{w.salarie.prenom} {w.salarie.nom}</td>
                  <td className="p-3"><StatusTag statut={w.statut} /></td>
                  <td className="p-3">{w.chantier ?? "—"}</td>
                  <td className="p-3">{w.debut ?? "—"}</td>
                  <td className="p-3 font-semibold">{w.statut === "hors-ligne" ? "—" : formatDuration(w.dureeMin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-xs text-muted font-medium mb-1">{label}</div>
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="text-xs text-success mt-1.5 font-semibold">{trend}</div>
    </div>
  );
}

function StatusTag({ statut }: { statut: WorkerStatus["statut"] }) {
  const config = {
    travail: { bg: "bg-success/15", text: "text-success", label: "● En travail" },
    pause: { bg: "bg-warning/15", text: "text-warning", label: "● En pause" },
    "hors-ligne": { bg: "bg-white/10", text: "text-muted", label: "Non pointé" },
  }[statut];
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="text-center py-8 text-muted text-sm">{message}</div>;
}

function calcTotalMinutes(pointages: PointageWithRelations[]): number {
  // Group by (salarié, day), compute work - pause durations
  const bySalarieDay: Record<string, PointageWithRelations[]> = {};
  for (const p of pointages) {
    const day = p.timestamp.slice(0, 10);
    const key = `${p.salarie_id}-${day}`;
    (bySalarieDay[key] ??= []).push(p);
  }

  let totalMs = 0;
  for (const list of Object.values(bySalarieDay)) {
    list.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let started: number | null = null;
    let working = false;
    for (const p of list) {
      const ts = new Date(p.timestamp).getTime();
      if (p.type === "debut" || p.type === "reprise") {
        if (!working) {
          started = ts;
          working = true;
        }
      } else if ((p.type === "pause" || p.type === "fin") && working && started !== null) {
        totalMs += ts - started;
        started = null;
        working = false;
      }
    }
  }
  return Math.floor(totalMs / 60000);
}

function calcTotalMinutesSemaine(pointagesMois: PointageWithRelations[]): number {
  const now = new Date();
  const day = now.getDay() === 0 ? 7 : now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (day - 1));
  weekStart.setHours(0, 0, 0, 0);
  return calcTotalMinutes(pointagesMois.filter((p) => new Date(p.timestamp) >= weekStart));
}
