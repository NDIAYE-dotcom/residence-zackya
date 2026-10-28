// =============================================================================
//  Zaquia Résidence — Edge Function « creer-employe »
//
//  Actions (réservées à un ADMINISTRATEUR ACTIF) :
//   - action « creer »                 : crée le compte d'un employé (email + mot de passe),
//                                        confirmé d'office, puis règle son rôle / actif.
//   - action « changer_mot_de_passe »  : définit un nouveau mot de passe pour un employé.
//
//  La clé service_role n'existe QUE ici (fournie automatiquement par Supabase),
//  jamais dans l'application React.
//
//  Déploiement : Supabase > Edge Functions > Deploy a new function > Via Editor,
//  nom « creer-employe », coller ce fichier, puis Settings > DÉSACTIVER « Verify JWT
//  with legacy secret » (la fonction vérifie elle-même que l'appelant est un admin actif).
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const ROLES = ['admin', 'gerant', 'receptionniste', 'menage', 'comptable'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (corps, statut = 200) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée.' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  // ---------- Qui appelle ? Doit être un administrateur actif ----------
  const jeton = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const { data: auth } = await admin.auth.getUser(jeton);
  if (!auth?.user) return json({ erreur: 'Session expirée : reconnectez-vous.' }, 401);

  const { data: appelant } = await admin
    .from('profiles').select('role, actif').eq('id', auth.user.id).single();
  if (appelant?.role !== 'admin' || !appelant.actif) {
    return json({ erreur: 'Seul un administrateur peut gérer les comptes du personnel.' }, 403);
  }

  let corps;
  try {
    corps = await req.json();
  } catch {
    return json({ erreur: 'Requête invalide.' }, 400);
  }

  const motDePasse = String(corps.password || '');
  if (motDePasse.length < 8) return json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères.' }, 400);

  // ---------- Changer le mot de passe d'un employé ----------
  if (corps.action === 'changer_mot_de_passe') {
    if (!corps.id) return json({ erreur: 'Employé manquant.' }, 400);
    const { error } = await admin.auth.admin.updateUserById(corps.id, { password: motDePasse });
    if (error) return json({ erreur: 'Impossible de changer le mot de passe.' }, 400);
    await admin.from('journal_activite').insert({
      user_id: auth.user.id, action: 'personnel.mot_de_passe', cible_table: 'profiles', cible_id: corps.id,
    });
    return json({ ok: true });
  }

  // ---------- Créer un employé ----------
  if (corps.action !== 'creer') return json({ erreur: 'Action inconnue.' }, 400);

  const email = String(corps.email || '').trim().toLowerCase();
  const fullName = String(corps.full_name || '').trim();
  const phone = corps.phone ? String(corps.phone).trim() : null;
  const role = corps.role;
  const actif = corps.actif !== false;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ erreur: 'Adresse email invalide.' }, 400);
  if (!fullName) return json({ erreur: 'Le nom est obligatoire.' }, 400);
  if (!ROLES.includes(role)) return json({ erreur: 'Rôle invalide.' }, 400);

  const { data: cree, error } = await admin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true, // pas d'email de confirmation : l'admin transmet les accès
    user_metadata: { full_name: fullName, phone },
  });
  if (error) {
    const dejaPris = /already been registered|already exists/i.test(error.message);
    return json({ erreur: dejaPris ? 'Cette adresse email a déjà un compte.' : 'Création du compte impossible.' }, 400);
  }

  // Le trigger handle_new_user a créé le profil (inactif, réception) : on applique le choix de l'admin
  const { error: errProfil } = await admin
    .from('profiles')
    .update({ full_name: fullName, phone, role, actif, email })
    .eq('id', cree.user.id);
  if (errProfil) {
    await admin.auth.admin.deleteUser(cree.user.id); // pas de compte à moitié créé
    return json({ erreur: 'Création du profil impossible.' }, 500);
  }

  await admin.from('journal_activite').insert({
    user_id: auth.user.id, action: 'personnel.cree', cible_table: 'profiles', cible_id: cree.user.id,
    details: { email, role, actif },
  });

  return json({ ok: true, id: cree.user.id });
});
