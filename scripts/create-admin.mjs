// ============================================================
// RENOV352 — Créer un compte administrateur (dashboard)
// ============================================================
// Usage (depuis le dossier dashboard/) :
//   node scripts/create-admin.mjs <email> "<mot_de_passe>"
//
// Crée un utilisateur déjà confirmé (email_confirm = true), donc utilisable
// immédiatement pour se connecter au dashboard — sans email de validation.
//
// Nécessite deux variables d'environnement :
//   NEXT_PUBLIC_SUPABASE_URL      (ex. https://<ton-projet>.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY     (Supabase → Project Settings → API → service_role)
//
// ⚠️ La clé service_role est SECRÈTE : ne jamais la committer, la passer
//    uniquement en variable d'environnement.
// ============================================================

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const password = process.argv[3];

if (!url || !serviceKey) {
  console.error("❌ Définis NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!email || !password) {
  console.error('Usage : node scripts/create-admin.mjs <email> "<mot_de_passe>"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("❌ Choisis un mot de passe d'au moins 8 caractères.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  if (String(error.message).toLowerCase().includes("already")) {
    console.error(`❌ Un compte existe déjà pour ${email}. Pour changer son mot de passe, utilise reset-admin-password.mjs.`);
  } else {
    console.error("❌ Échec de la création :", error.message);
  }
  process.exit(1);
}

console.log(`✅ Compte admin créé : ${email} (id ${data.user.id}). Il peut se connecter au dashboard.`);
