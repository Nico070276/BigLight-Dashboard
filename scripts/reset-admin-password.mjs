// ============================================================
// RENOV352 — Réinitialiser le mot de passe d'un admin
// ============================================================
// Usage (depuis le dossier dashboard/) :
//   node scripts/reset-admin-password.mjs <email> "<nouveau_mot_de_passe>"
//
// Nécessite deux variables d'environnement :
//   NEXT_PUBLIC_SUPABASE_URL      (ex. https://<ton-projet>.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY     (Supabase → Project Settings → API → service_role)
//
// ⚠️ La clé service_role est SECRÈTE : ne jamais la mettre dans le code,
//    ni la committer. On la passe uniquement en variable d'environnement.
// ============================================================

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const newPassword = process.argv[3];

if (!url || !serviceKey) {
  console.error("❌ Définis NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!email || !newPassword) {
  console.error('Usage : node scripts/reset-admin-password.mjs <email> "<nouveau_mot_de_passe>"');
  process.exit(1);
}
if (newPassword.length < 8) {
  console.error("❌ Choisis un mot de passe d'au moins 8 caractères.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

// Retrouver l'utilisateur par email
let user = null;
for (let page = 1; page <= 20; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (user || data.users.length < 200) break;
}

if (!user) {
  console.error(`❌ Aucun utilisateur avec l'email ${email}.`);
  process.exit(1);
}

const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
if (error) throw error;

console.log(`✅ Mot de passe mis à jour pour ${email}. Tu peux te connecter avec le nouveau.`);
