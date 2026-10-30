# Zaquia Résidence

Application de gestion et de réservation de studios meublés (Ziguinchor, Sénégal) :
location à l'heure, demi-journée, journée, nuitée, semaine ou mois.

🌐 **En ligne : https://residence-zackya.vercel.app** — administration : `/admin`

- **Site public** : accueil (diaporama, recherche), `/studios`, `/studios/:id` (calendrier), `/reserver`,
  `/confirmation/:ref`, `/suivi` (référence seule = statut ; + téléphone = paiements).
- **Administration** (`/admin`) : tableau de bord, planning temps réel, réservations (création en 3 étapes, fiche et
  cycle de vie), clients, studios & tarifs, caisse (clôture, reçus PDF), dépenses, rapports, ménage, maintenance &
  inventaire, personnel, paramètres (journal, sauvegarde).

## Stack

React 18 + Vite (JavaScript), CSS pur, react-router-dom v6, Supabase (Auth, PostgreSQL + RLS, Storage, RPC, Realtime,
Edge Functions, pg_cron), jsPDF (reçus), Recharts (rapports). Hébergement : Vercel.

## Développer en local

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (jamais la clé service_role)
npm run dev            # http://localhost:5173
npm run build          # doit passer sans erreur avant chaque mise en ligne
```

## Base de données

Dans Supabase > **SQL Editor**, dans l'ordre : `supabase/schema.sql`, puis chaque fichier de
`supabase/migrations/` (001 → 018). Chaque migration se termine par une requête de vérification.

| Migration | Contenu |
|---|---|
| 001 | Adresse Ziguinchor |
| 002 | Stockage des photos des studios |
| 003 | Personnel (email, dernier admin protégé) |
| 004 | Clients (liste noire, statistiques) |
| 005 | Réservations (studios libres, création en une transaction) |
| 006 | Cycle de vie (statuts, prolonger, changer de studio, historique) |
| 007 | Temps réel du planning |
| 008 | Caisse (n° de reçu, restitution de caution, clôture) |
| 009 | Catégories de dépenses |
| 010–011 | Rapports (+ correctif occupation) |
| 012 | Ménage |
| 013 | Maintenance & inventaire |
| 014 | Paramètres (catégories, journal) |
| 015 | Calendrier public + coordonnées |
| 016 | Réservation en ligne renforcée + suivi |
| 017 | Statut par référence (inclus aussi dans 018) |
| 018 | Sécurité par rôle + annulation automatique (pg_cron) |

## Edge Functions (Supabase > Edge Functions > Deploy > Via Editor, « Verify JWT » désactivé)

- `creer-employe` — création des comptes du personnel / mot de passe (déployée).
- `notifier` — email de confirmation (Resend) + WhatsApp Business : **à déployer après l'achat du nom de domaine**.

## Mise en ligne (Vercel)

Déploiement automatique à chaque `git push` sur `main`. `vercel.json` gère les routes de l'application, le cache et les
en-têtes de sécurité. Variables d'environnement Vercel : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
Supabase > Authentication > URL Configuration : Site URL = adresse du site, Redirect URL = `<site>/admin/login`.

## Sauvegardes

Offre gratuite Supabase : pas de sauvegarde automatique. **Paramètres > Sauvegarde** télécharge toutes les données
(JSON) — à faire au moins une fois par mois (rappel sur le tableau de bord de l'admin).

## Suivi du projet

Feuille de route, décisions et reste à faire : `CLAUDE.md` (§ 9, § 10 et notes de progression).
