# Zaquia Résidence

Application de gestion et de réservation de studios meublés (Ziguinchor, Sénégal) :
location à l'heure, demi-journée, journée, nuitée, semaine ou mois.

- **Site public** (`/`) : recherche de disponibilité, réservation, suivi.
- **Administration** (`/admin`) : écran de chargement → connexion → tableau de bord, planning, réservations,
  clients, studios & tarifs, caisse, dépenses, ménage, maintenance, rapports, personnel, paramètres.

## Stack

React 18 + Vite (JavaScript), CSS pur, react-router-dom v6, Supabase (Auth, PostgreSQL, Storage, RPC, Realtime, Edge Functions).

## Installation

```bash
npm install
cp .env.example .env   # puis remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm run dev            # http://localhost:5173
```

## Base de données

1. Supabase > **SQL Editor** > **New query** : coller tout `supabase/schema.sql` puis **Run**.
2. Les modifications ultérieures sont dans `supabase/migrations/NNN_description.sql`, à exécuter dans l'ordre.
3. Premier admin : créer l'utilisateur dans **Authentication > Users**, puis exécuter la requête
   `update profiles set role = 'admin', actif = true ...` (fin de `schema.sql`).

⚠️ Ne jamais mettre la clé `service_role` dans le front : seule `VITE_SUPABASE_ANON_KEY` va dans `.env`.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (`dist/`) |
| `npm run preview` | Prévisualiser le build |

## Suivi du projet

La feuille de route et l'avancement sont dans `CLAUDE.md` (§ 9 et § 10).
