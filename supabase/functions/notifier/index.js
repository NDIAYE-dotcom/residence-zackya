// =============================================================================
//  Zaquia Résidence — Edge Function « notifier »
//
//  Prévient le client quand sa réservation est CONFIRMÉE :
//   - email via Resend (si le client a un email et que RESEND_API_KEY est configurée)
//   - WhatsApp Business API (emplacement prêt : actif seulement si WHATSAPP_TOKEN
//     et WHATSAPP_PHONE_ID sont configurés — compte Meta validé nécessaire)
//
//  Appel : POST { reservation_id, evenement: 'confirmee' } par un membre du personnel
//  connecté (admin, gérant, réception) — vérifié ici.
//
//  Secrets (Supabase > Edge Functions > Secrets) :
//   RESEND_API_KEY      clé Resend (obligatoire pour l'email)
//   EMAIL_EXPEDITEUR    ex. « Zaquia Résidence <reservations@votre-domaine.sn> »
//                       (par défaut : onboarding@resend.dev, tests uniquement)
//   SITE_URL            ex. https://zaquia-residence.sn (logo + lien de suivi dans l'email)
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE (facultatifs, plus tard)
//
//  Déploiement : Edge Functions > Deploy a new function > Via Editor, nom « notifier »,
//  coller ce fichier, puis Settings > DÉSACTIVER « Verify JWT with legacy secret ».
// =============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (corps, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const FORMULES = { heure: 'À l’heure', demi_journee: 'Demi-journée', journee: 'Journée', nuitee: 'Nuitée', semaine: 'Semaine', mois: 'Mois' };
const echapper = (t = '') => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fcfa = (n) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/ | /g, ' ')} FCFA`;
const date = (d) => new Date(d).toLocaleString('fr-FR', {
  timeZone: 'Africa/Dakar', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
});

// ---------- Email de confirmation (HTML simple, compatible messageries) ----------
function emailConfirmation({ r, client, studio, params, site }) {
  const net = r.montant_total - r.remise;
  const lignes = [
    ['Référence', `<strong style="font-family:monospace;font-size:16px;color:#002668">${echapper(r.reference)}</strong>`],
    ['Studio', `${echapper(studio.nom)} (${echapper(studio.code)})`],
    ['Formule', echapper(FORMULES[r.formule] ?? r.formule)],
    ['Arrivée', echapper(date(r.date_debut))],
    ['Départ', echapper(date(r.date_fin))],
    ['Montant', `<strong style="color:#b4001a">${fcfa(net)}</strong>`],
  ];
  const suivi = site ? `${site}/suivi?ref=${encodeURIComponent(r.reference)}` : null;
  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#1b1f2a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border-top:5px solid #b4001a">
    <tr><td align="center" style="padding:24px 24px 8px">
      ${site ? `<img src="${site}/logo-zaquia.png" width="110" alt="Zaquia Résidence" style="display:block">` : '<strong style="font-size:22px;color:#002668">ZAQUIA RÉSIDENCE</strong>'}
    </td></tr>
    <tr><td style="padding:8px 28px 0">
      <h1 style="margin:0 0 8px;font-size:22px;color:#002668">Votre réservation est confirmée ✓</h1>
      <p style="margin:0 0 18px;line-height:1.6">Bonjour ${echapper(client.full_name)},<br>nous avons le plaisir de vous confirmer votre séjour à Zaquia Résidence.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dfe4ee;border-radius:8px">
        ${lignes.map(([k, v], i) => `<tr><td style="padding:10px 14px;color:#5b6475;font-size:14px;${i ? 'border-top:1px solid #dfe4ee;' : ''}">${k}</td><td align="right" style="padding:10px 14px;font-size:14px;${i ? 'border-top:1px solid #dfe4ee;' : ''}">${v}</td></tr>`).join('')}
      </table>
      <p style="margin:18px 0 0;line-height:1.6;font-size:14px">À votre arrivée, merci de présenter une <strong>pièce d’identité</strong> (CNI ou passeport).</p>
      ${suivi ? `<p style="margin:18px 0 0" align="center"><a href="${suivi}" style="display:inline-block;background:#002668;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">Suivre ma réservation</a></p>` : ''}
    </td></tr>
    <tr><td style="padding:24px 28px;color:#5b6475;font-size:13px;line-height:1.6;border-top:1px solid #dfe4ee;margin-top:24px">
      <strong style="color:#002668">Zaquia Résidence</strong><br>${echapper(params.adresse ?? '')}<br>
      ${params.telephone ? `Mobile : ${echapper(params.telephone)}<br>` : ''}${params.telephone_fixe ? `Tél : ${echapper(params.telephone_fixe)}<br>` : ''}
      ${params.whatsapp ? `WhatsApp : <a href="https://wa.me/${echapper(params.whatsapp)}" style="color:#002668">écrire à la réception</a>` : ''}
    </td></tr>
  </table></td></tr></table></body></html>`;
  const texte = `Bonjour ${client.full_name},\nVotre réservation ${r.reference} à Zaquia Résidence est confirmée.\n`
    + `Studio : ${studio.nom} (${studio.code})\nArrivée : ${date(r.date_debut)}\nDépart : ${date(r.date_fin)}\nMontant : ${fcfa(net)}\n`
    + `Merci de présenter une pièce d'identité à l'arrivée.\n${suivi ? `Suivi : ${suivi}\n` : ''}Zaquia Résidence · ${params.telephone ?? ''}`;
  return { sujet: `Réservation confirmée · ${r.reference} · Zaquia Résidence`, html, texte };
}

async function envoyerEmail({ a, sujet, html, texte, repondreA }) {
  const cle = Deno.env.get('RESEND_API_KEY');
  if (!cle) return { statut: 'non_configure' };
  const reponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('EMAIL_EXPEDITEUR') || 'Zaquia Résidence <onboarding@resend.dev>',
      to: [a], subject: sujet, html, text: texte, ...(repondreA ? { reply_to: repondreA } : {}),
    }),
  });
  if (reponse.ok) return { statut: 'envoye' };
  const detail = await reponse.text();
  return { statut: 'erreur', detail: detail.slice(0, 300) };
}

// ---------- WhatsApp Business API (emplacement prévu, inactif sans secrets) ----------
async function envoyerWhatsApp({ telephone, parametres }) {
  const jeton = Deno.env.get('WHATSAPP_TOKEN');
  const numeroId = Deno.env.get('WHATSAPP_PHONE_ID');
  if (!jeton || !numeroId) return { statut: 'non_configure' };
  // Modèle de message à faire valider par Meta (ex. « reservation_confirmee » avec 4 variables)
  const reponse = await fetch(`https://graph.facebook.com/v20.0/${numeroId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: telephone.replace('+', ''),
      type: 'template',
      template: {
        name: Deno.env.get('WHATSAPP_TEMPLATE') || 'reservation_confirmee',
        language: { code: 'fr' },
        components: [{ type: 'body', parameters: parametres.map((t) => ({ type: 'text', text: t })) }],
      },
    }),
  });
  return reponse.ok ? { statut: 'envoye' } : { statut: 'erreur', detail: (await reponse.text()).slice(0, 300) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ erreur: 'Méthode non autorisée.' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

  // Appelant : personnel actif qui gère les réservations
  const jeton = (req.headers.get('Authorization') || '').replace('Bearer ', '');
  const { data: auth } = await admin.auth.getUser(jeton);
  if (!auth?.user) return json({ erreur: 'Session expirée : reconnectez-vous.' }, 401);
  const { data: appelant } = await admin.from('profiles').select('role, actif').eq('id', auth.user.id).single();
  if (!appelant?.actif || !['admin', 'gerant', 'receptionniste'].includes(appelant.role)) {
    return json({ erreur: 'Accès réservé au personnel de la réception.' }, 403);
  }

  let corps;
  try { corps = await req.json(); } catch { return json({ erreur: 'Requête invalide.' }, 400); }
  if (corps.evenement !== 'confirmee') return json({ erreur: 'Événement inconnu.' }, 400);

  const { data: r } = await admin
    .from('reservations')
    .select('id, reference, formule, date_debut, date_fin, montant_total, remise, statut, client:clients(full_name, email, phone), studio:studios(nom, code)')
    .eq('id', corps.reservation_id)
    .single();
  if (!r) return json({ erreur: 'Réservation introuvable.' }, 404);
  if (r.statut !== 'confirmee') return json({ erreur: 'La réservation n’est pas confirmée.' }, 400);

  const { data: lignes } = await admin.from('parametres').select('cle, valeur');
  const params = Object.fromEntries((lignes ?? []).map((p) => [p.cle, p.valeur]));
  const site = (Deno.env.get('SITE_URL') || '').replace(/\/$/, '');

  // Email
  let email = { statut: 'sans_email' };
  if (r.client?.email) {
    const contenu = emailConfirmation({ r, client: r.client, studio: r.studio, params, site });
    email = await envoyerEmail({ a: r.client.email, sujet: contenu.sujet, html: contenu.html, texte: contenu.texte, repondreA: params.email });
  }

  // WhatsApp (plus tard)
  const whatsapp = await envoyerWhatsApp({
    telephone: r.client.phone,
    parametres: [r.client.full_name, r.reference, `${r.studio.nom} (${r.studio.code})`, date(r.date_debut)],
  });

  await admin.from('journal_activite').insert({
    user_id: auth.user.id, action: 'notification.confirmation', cible_table: 'reservations', cible_id: r.id,
    details: { reference: r.reference, email: email.statut, whatsapp: whatsapp.statut },
  });

  return json({ email: email.statut, whatsapp: whatsapp.statut, detail: email.detail ?? whatsapp.detail ?? null });
});
