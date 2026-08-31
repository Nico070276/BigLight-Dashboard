"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Composant de pointage WEB dédié à UN seul ouvrier, pour iPhone (pas d'APK iOS).
// Même backend (RPC worker_*) que l'app mobile. L'ouvrier est passé en prop ;
// les clés localStorage sont isolées par ouvrier pour éviter tout croisement.
export type PointerOuvrier = { id: string; prenom: string; nom: string };

type Chantier = { id: string; nom: string; adresse: string | null; statut: string };
type PType = "debut" | "pause" | "reprise" | "fin";
type Last = { type: PType; timestamp: string } | null;
type MonthRow = { type: PType; ts: string; chantier: string | null };
type Hours = {
  todayMin: number;
  weekMin: number;
  monthMin: number;
  parChantier: { chantier: string; minutes: number }[];
};

const L = {
  app: "BIG LIGHT Pointage",
  enterPin: "Entrez votre code PIN",
  login: "Connexion",
  pinWrong: "Code PIN incorrect",
  chooseChantier: "Choisissez le chantier",
  loading: "Chargement…",
  logout: "Déconnexion",
  change: "Changer",
  saving: "Enregistrement…",
  debut: "Arrivée",
  pause: "Pause",
  reprise: "Reprise",
  fin: "Départ",
  working: "En poste",
  onPause: "En pause",
  notStarted: "Non commencé",
  finished: "Journée terminée",
  myTime: "Mon temps de travail",
  today: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois-ci",
  dayDone: "Journée terminée",
  recapTitle: "Récapitulatif du temps de travail",
  close: "Fermer",
  gpsDenied: "Géolocalisation refusée. Le pointage est impossible sans elle.",
  gpsError: "Impossible d'obtenir la position.",
  saveError: "Erreur. Vérifiez votre connexion.",
  gpsNotice: "La géolocalisation n'est enregistrée qu'au moment du pointage.",
};

const LABELS: Record<PType, string> = { debut: L.debut, pause: L.pause, reprise: L.reprise, fin: L.fin };
const COLORS: Record<PType, string> = { debut: "#10b981", pause: "#f59e0b", reprise: "#10b981", fin: "#ef4444" };

function nextAllowedActions(last: Last): PType[] {
  if (!last) return ["debut"];
  switch (last.type) {
    case "debut":
    case "reprise":
      return ["pause", "fin"];
    case "pause":
      return ["reprise", "fin"];
    case "fin":
      return ["debut"];
  }
}

function statusLabel(last: Last): string {
  if (!last) return L.notStarted;
  if (last.type === "pause") return L.onPause;
  if (last.type === "fin") return L.finished;
  return L.working;
}

function fmt(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

function localDay(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Bornes locales (jour "YYYY-MM-DD", comparables lexicographiquement).
function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Lundi de la semaine en cours (semaine ISO : lundi → dimanche).
function weekStartKey(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - dow);
  return dayKey(d);
}

function monthStartKey(now: Date): string {
  return dayKey(new Date(now.getFullYear(), now.getMonth(), 1));
}

function computeHours(rows: MonthRow[]): Hours {
  const now = new Date();
  const today = dayKey(now);
  const weekStart = weekStartKey(now);
  const monthStart = monthStartKey(now);
  const byDay: Record<string, MonthRow[]> = {};
  for (const r of rows) (byDay[localDay(r.ts)] ??= []).push(r);
  let todayMin = 0;
  let weekMin = 0;
  let monthMin = 0;
  const par: Record<string, number> = {};
  for (const [day, list] of Object.entries(byDay)) {
    list.sort((a, b) => a.ts.localeCompare(b.ts));
    let started: number | null = null;
    let curCh: string | null = null;
    let dayMin = 0;
    const dayPar: Record<string, number> = {};
    const close = (end: number) => {
      if (started === null) return;
      const seg = Math.floor((end - started) / 60000);
      dayMin += seg;
      const ch = curCh ?? "—";
      dayPar[ch] = (dayPar[ch] ?? 0) + seg;
      started = null;
    };
    for (const p of list) {
      const t = new Date(p.ts).getTime();
      if (p.chantier) curCh = p.chantier;
      if (p.type === "debut" || p.type === "reprise") {
        if (started === null) started = t;
      } else close(t);
    }
    if (started !== null && day === today) close(Date.now());
    // Le RPC renvoie aussi quelques jours du mois précédent (semaine à cheval) :
    // ils comptent pour la semaine, mais pas pour le mois ni la répartition.
    if (day >= weekStart) weekMin += dayMin;
    if (day >= monthStart) {
      monthMin += dayMin;
      for (const [ch, m] of Object.entries(dayPar)) par[ch] = (par[ch] ?? 0) + m;
    }
    if (day === today) todayMin = dayMin;
  }
  const parChantier = Object.entries(par)
    .filter(([, m]) => m > 0)
    .map(([chantier, minutes]) => ({ chantier, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
  return { todayMin, weekMin, monthMin, parChantier };
}

function getCoords(): Promise<{ lat: number; lng: number; acc: number | null }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return reject(new Error("nogeo"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy ?? null }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
    );
  });
}

type Phase = "loading" | "login" | "chantier" | "pointage";

export default function PointerClient({ ouvrier }: { ouvrier: PointerOuvrier }) {
  const PIN_KEY = `biglight.pointer.pin.${ouvrier.id}`;
  const CHANTIER_KEY = `biglight.pointer.chantier.${ouvrier.id}`;

  const [phase, setPhase] = useState<Phase>("loading");
  const [pin, setPin] = useState<string>("");
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyLogin, setBusyLogin] = useState(false);

  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [chantier, setChantier] = useState<Chantier | null>(null);

  const [last, setLast] = useState<Last>(null);
  const [hours, setHours] = useState<Hours | null>(null);
  const [busy, setBusy] = useState<PType | null>(null);
  // Récap affiché après la fin de journée (bouton « Départ »).
  const [recap, setRecap] = useState<Hours | null>(null);

  async function loadChantiers(): Promise<Chantier[]> {
    const { data, error: e } = await supabase.rpc("worker_list_chantiers");
    if (e) throw e;
    const list = (data as Chantier[]) ?? [];
    setChantiers(list);
    return list;
  }

  const refresh = useCallback(async (curPin: string, ouvrierId: string): Promise<Hours | null> => {
    const [l, h] = await Promise.all([
      supabase.rpc("worker_last_pointage_today", { p_ouvrier_id: ouvrierId, p_pin: curPin }),
      supabase.rpc("worker_month_pointages", { p_ouvrier_id: ouvrierId, p_pin: curPin }),
    ]);
    if (l.error) throw l.error;
    const rows = (l.data as { type: PType; ts: string }[]) ?? [];
    setLast(rows[0] ? { type: rows[0].type, timestamp: rows[0].ts } : null);
    if (h.error) return null;
    const computed = computeHours((h.data as MonthRow[]) ?? []);
    setHours(computed);
    return computed;
  }, []);

  // Restauration de session
  useEffect(() => {
    (async () => {
      const savedPin = typeof window !== "undefined" ? localStorage.getItem(PIN_KEY) : null;
      if (!savedPin) {
        setPhase("login");
        return;
      }
      try {
        const list = await loadChantiers();
        setPin(savedPin);
        const savedCh = localStorage.getItem(CHANTIER_KEY);
        const found = savedCh ? list.find((c) => c.id === savedCh) : null;
        if (found) {
          setChantier(found);
          await refresh(savedPin, ouvrier.id);
          setPhase("pointage");
        } else {
          setPhase("chantier");
        }
      } catch {
        localStorage.removeItem(PIN_KEY);
        setPhase("login");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pinInput.length !== 4) return;
    setBusyLogin(true);
    setError(null);
    try {
      const { data, error: e2 } = await supabase.rpc("worker_login", {
        p_ouvrier_id: ouvrier.id,
        p_pin: pinInput,
      });
      if (e2) throw e2;
      const r = (data ?? {}) as { ok?: boolean; locked?: boolean; retry_in?: number };
      if (!r.ok) {
        if (r.locked) {
          const min = Math.max(1, Math.ceil((r.retry_in ?? 0) / 60));
          setError(`Trop de tentatives. Réessayez dans ${min} min.`);
        } else {
          setError(L.pinWrong);
        }
        setPinInput("");
        setBusyLogin(false);
        return;
      }
      localStorage.setItem(PIN_KEY, pinInput);
      setPin(pinInput);
      await loadChantiers();
      setPhase("chantier");
    } catch {
      setError(L.saveError);
    } finally {
      setBusyLogin(false);
    }
  }

  function pickChantier(c: Chantier) {
    setChantier(c);
    localStorage.setItem(CHANTIER_KEY, c.id);
    setPhase("pointage");
    refresh(pin, ouvrier.id).catch(() => {});
  }

  function logout() {
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(CHANTIER_KEY);
    setPin("");
    setPinInput("");
    setChantier(null);
    setLast(null);
    setHours(null);
    setPhase("login");
  }

  async function doPointage(type: PType) {
    if (!chantier) return;
    setBusy(type);
    try {
      let coords: { lat: number; lng: number; acc: number | null };
      try {
        coords = await getCoords();
      } catch (err) {
        const denied = typeof err === "object" && err !== null && "code" in err && (err as GeolocationPositionError).code === 1;
        alert(denied ? L.gpsDenied : L.gpsError);
        return;
      }
      const { error: e } = await supabase.rpc("worker_record_pointage", {
        p_ouvrier_id: ouvrier.id,
        p_pin: pin,
        p_chantier_id: chantier.id,
        p_type: type,
        p_latitude: coords.lat,
        p_longitude: coords.lng,
        p_accuracy: coords.acc,
      });
      if (e) throw e;
      const fresh = await refresh(pin, ouvrier.id);
      if (type === "fin" && fresh) setRecap(fresh);
    } catch {
      alert(L.saveError);
    } finally {
      setBusy(null);
    }
  }

  // ---------- Rendu ----------
  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col p-6 pt-12 max-w-md mx-auto">{children}</div>
  );

  if (phase === "loading") {
    return shell(<div className="flex-1 flex items-center justify-center text-[#94a3b8]">{L.loading}</div>);
  }

  if (phase === "login") {
    return shell(
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-3xl font-bold mb-1">{L.app}</h1>
        <p className="text-[#94a3b8] mb-6">
          {ouvrier.prenom} {ouvrier.nom}
        </p>
        <form onSubmit={handleLogin}>
          <p className="text-[#94a3b8] mb-2">{L.enterPin}</p>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
            autoFocus
            placeholder="••••"
            className="w-full text-center text-3xl tracking-[0.5em] bg-[#1e293b] rounded-xl py-4 mb-4 outline-none"
          />
          {error && <p className="text-[#ef4444] text-center mb-3">{error}</p>}
          <button
            type="submit"
            disabled={pinInput.length !== 4 || busyLogin}
            className="w-full bg-[#f59e0b] text-[#0f172a] font-bold text-lg py-4 rounded-xl disabled:opacity-40"
          >
            {busyLogin ? L.loading : L.login}
          </button>
        </form>
      </div>
    );
  }

  if (phase === "chantier") {
    return shell(
      <>
        <div className="flex items-center justify-between mb-6">
          <span className="font-semibold">
            {ouvrier.prenom} {ouvrier.nom}
          </span>
          <button onClick={logout} className="text-[#f59e0b]">
            {L.logout}
          </button>
        </div>
        <h2 className="text-2xl font-bold mb-4">{L.chooseChantier}</h2>
        <div className="flex flex-col gap-3">
          {chantiers.map((c) => (
            <button
              key={c.id}
              onClick={() => pickChantier(c)}
              className="text-left bg-[#1e293b] rounded-xl p-4 active:opacity-70"
            >
              <div className="text-lg font-semibold">{c.nom}</div>
              {c.adresse && <div className="text-sm text-[#94a3b8] mt-1">{c.adresse}</div>}
            </button>
          ))}
        </div>
      </>
    );
  }

  // phase pointage
  const allowed = nextAllowedActions(last);
  return shell(
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="font-semibold">
          {ouvrier.prenom} {ouvrier.nom}
        </span>
        <button onClick={() => setPhase("chantier")} className="text-[#f59e0b]">
          {L.change}
        </button>
      </div>

      <div className="bg-[#1e293b] rounded-2xl p-5 mb-5">
        <div className="text-xl font-bold">{chantier?.nom}</div>
        {chantier?.adresse && <div className="text-[#94a3b8] text-sm mt-1">{chantier.adresse}</div>}
        <div className="flex items-center gap-2 mt-4">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[last?.type ?? "debut"] }} />
          <span className="text-[#e2e8f0]">{statusLabel(last)}</span>
        </div>
      </div>

      {hours && (
        <div className="bg-[#1e293b] rounded-2xl p-4 mb-5">
          <div className="text-xs uppercase text-[#94a3b8] font-semibold mb-2">{L.myTime}</div>
          <div className="flex justify-between mb-1">
            <span className="text-[#e2e8f0]">{L.today}</span>
            <span className="font-bold text-lg">{fmt(hours.todayMin)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-[#e2e8f0]">{L.week}</span>
            <span className="font-bold text-lg">{fmt(hours.weekMin)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#e2e8f0]">{L.month}</span>
            <span className="font-bold text-lg">{fmt(hours.monthMin)}</span>
          </div>
          {hours.parChantier.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[#334155] space-y-1">
              {hours.parChantier.map((c) => (
                <div key={c.chantier} className="flex justify-between text-sm">
                  <span className="text-[#94a3b8] truncate mr-2">{c.chantier}</span>
                  <span className="text-[#cbd5e1] font-semibold">{fmt(c.minutes)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {(["debut", "pause", "reprise", "fin"] as PType[]).map((type) => {
          const isAllowed = allowed.includes(type);
          return (
            <button
              key={type}
              disabled={!isAllowed || busy !== null}
              onClick={() => doPointage(type)}
              style={{ backgroundColor: COLORS[type] }}
              className={`text-[#0f172a] font-extrabold text-xl py-5 rounded-2xl ${!isAllowed ? "opacity-25" : "active:opacity-80"}`}
            >
              {busy === type ? L.saving : LABELS[type]}
            </button>
          );
        })}
      </div>

      <p className="text-[#64748b] text-xs text-center mt-auto pt-4">{L.gpsNotice}</p>

      {recap && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          onClick={() => setRecap(null)}
        >
          <div
            className="bg-[#1e293b] rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-2xl font-bold mb-1">{L.dayDone}</div>
            <div className="text-center text-[#94a3b8] mb-5">{L.recapTitle}</div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[#e2e8f0]">{L.today}</span>
              <span className="font-extrabold text-2xl text-[#10b981]">{fmt(recap.todayMin)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[#e2e8f0]">{L.week}</span>
              <span className="font-bold text-xl">{fmt(recap.weekMin)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#e2e8f0]">{L.month}</span>
              <span className="font-bold text-xl">{fmt(recap.monthMin)}</span>
            </div>
            <button
              onClick={() => setRecap(null)}
              className="w-full mt-6 bg-[#f59e0b] text-[#0f172a] font-bold text-lg py-4 rounded-xl cursor-pointer transition-opacity duration-200 active:opacity-80"
            >
              {L.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
