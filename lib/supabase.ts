import { createBrowserClient } from '@supabase/ssr';

// Client navigateur partagé par toutes les pages admin.
// Il lit la session via les cookies (comme le middleware et la page de
// login), afin que les requêtes partent avec le rôle `authenticated`.
// Indispensable une fois la RLS verrouillée (voir backend/03_rls_lockdown.sql) :
// un client anon classique serait rejeté par les nouvelles policies.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type Salarie = {
  id: string;
  nom: string;
  prenom: string;
  pin_hash: string;
  email: string | null;
  telephone: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
};

export type Chantier = {
  id: string;
  nom: string;
  adresse: string | null;
  latitude: number | null;
  longitude: number | null;
  statut: 'actif' | 'demarrage' | 'termine';
  date_debut: string | null;
  date_fin: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Pointage = {
  id: string;
  salarie_id: string;
  chantier_id: string | null;
  type: 'debut' | 'pause' | 'reprise' | 'fin';
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy: number | null;
  manuel: boolean;
  created_at: string;
};

export type PointageWithRelations = Pointage & {
  salaries: Pick<Salarie, 'nom' | 'prenom'> | null;
  chantiers: Pick<Chantier, 'nom'> | null;
};

export type Absence = {
  id: string;
  salarie_id: string;
  date_debut: string;   // 'YYYY-MM-DD'
  date_fin: string;     // 'YYYY-MM-DD'
  type: 'conge' | 'maladie';
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type AbsenceWithRelations = Absence & {
  salaries: Pick<Salarie, 'nom' | 'prenom'> | null;
};
