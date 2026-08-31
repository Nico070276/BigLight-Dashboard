import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Route appelée quotidiennement par le Vercel Cron (voir vercel.json).
// Elle exécute une requête légère sur la base pour empêcher la mise en
// pause automatique du projet Supabase (offre gratuite : pause après ~1
// semaine d'inactivité).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Optionnel : si CRON_SECRET est défini côté Vercel, on vérifie l'en-tête
  // que Vercel Cron envoie automatiquement.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  // Requête minimale qui touche la base (fonctionne avant comme après le
  // verrouillage RLS : la requête s'exécute même si elle renvoie 0 ligne).
  const { error } = await supabase.from("chantiers").select("id").limit(1);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
