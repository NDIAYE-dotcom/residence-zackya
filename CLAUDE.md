# CLAUDE.md — Zaquia Résidence

> **Claude Code : ce fichier est ta seule source.** Le dossier du projet ne contient au départ que ce fichier.
> Tu dois construire TOUT le projet à partir d'ici, en guidant Ousmane étape par étape.
> Lis ce fichier en entier avant de commencer.

---

## 0. COMMENT TU TRAVAILLES AVEC MOI (à lire en premier)

Je m'appelle Ousmane. Je ne veux pas copier-coller de code : **c'est toi qui crées les fichiers et lances les commandes**.
Moi, je fais uniquement ce que tu ne peux pas faire (Supabase dans le navigateur, déposer le logo, tester dans le navigateur).

**Règles de collaboration :**
1. Avance **une étape à la fois** (voir § 9 « Feuille de route »). Au début de chaque étape, annonce en 2-3 lignes ce que tu vas faire.
2. Quand j'ai une action à faire (Supabase, logo, test), donne-moi des **instructions numérotées, très simples**,
   avec le nom exact des boutons et menus, puis **arrête-toi et attends ma confirmation** (« c'est fait »).
3. À la fin de chaque étape : liste des fichiers créés/modifiés, comment tester, puis coche l'étape dans § 10 « Suivi » de ce fichier.
4. Si la base de données doit changer après la Phase 0 : crée `supabase/migrations/NNN_description.sql` et guide-moi pour l'exécuter dans Supabase.
5. `npm run build` doit passer sans erreur à la fin de chaque étape.
6. Si je dis « continue », passe à l'étape suivante non cochée.
7. Tout est **en français** (interface, messages, explications).

**Ta toute première réponse** doit : me saluer, résumer le projet en 5 lignes, puis démarrer l'**Étape 0.1**.

---

## 1. Le projet

Zaquia Résidence (Ziguinchor, Sénégal) loue des **studios meublés** selon plusieurs formules :
**à l'heure, demi-journée, journée, nuitée, semaine, mois**.

Une seule application React avec **deux espaces** :

| Espace | URL | Pour qui | Rôle |
|---|---|---|---|
| Site de réservation | `/`, `/studios`, `/studios/:id`, `/reserver`, `/confirmation/:ref`, `/suivi` | Clients (sans compte) | Voir les studios, vérifier la dispo, réserver, suivre sa réservation |
| Administration | `/admin` → écran de chargement → `/admin/login` → `/admin/...` | Personnel | Gestion interne complète |

### Écran d'ouverture de l'Administration (`/admin`) — OBLIGATOIRE, à reproduire exactement
- Fond blanc, centré : **logo** → texte **« Administration »** → une **barre arrondie BLEUE** (le fond vide)
  → texte **« loading.... »** (points animés).
- La **barre ROUGE est animée** : elle se remplit de gauche à droite par-dessus la barre bleue, en ~3 s.
- Quand la barre rouge a rempli toute la barre bleue (100 %) : fondu, puis **la page de connexion apparaît automatiquement**
  (ou le tableau de bord si l'utilisateur est déjà connecté et actif).
- Code de référence complet fourni en § 8.

### Logo
Fichier : `public/logo-zaquia.png` (monogramme « ZR » bleu/rouge avec immeuble, « ZAQUIA » en bleu, « RÉSIDENCE » en rouge).
**Ousmane doit le déposer lui-même** dans `public/` (Étape 0.1). Utilisé : écran de chargement, login, sidebar admin, site public, favicon.

---

## 2. Stack (NE JAMAIS CHANGER)

- **React 18 + Vite**, **JavaScript uniquement (.jsx)** — ❌ pas de TypeScript
- **CSS pur** : un fichier `.css` par composant/page, à côté du `.jsx` (ex. `Home.jsx` + `Home.css`)
  — ❌ pas de Tailwind, pas de styled-components, pas de librairie UI (MUI, Bootstrap…)
- **react-router-dom v6**
- **Supabase** : Auth, PostgreSQL, Storage (photos), RPC, Realtime, Edge Functions
- Dépendances autorisées : `@supabase/supabase-js`, `react-router-dom`. Plus tard si besoin : `jspdf` (reçus PDF), `recharts` (graphiques).
  Rien d'autre sans me demander.

---

## 3. Arborescence cible

```
zaquia-residence/
  CLAUDE.md                          ← ce fichier
  README.md, .env, .env.example, .gitignore, index.html, package.json, vite.config.js
  public/logo-zaquia.png
  supabase/schema.sql                ← copie exacte du § 7
  supabase/migrations/NNN_nom.sql    ← modifications ultérieures
  src/
    main.jsx, App.jsx, index.css     ← index.css = variables de couleurs + classes communes
    lib/supabase.js                  ← client Supabase unique
    lib/format.js                    ← formatFCFA, dates, libellés
    context/AuthContext.jsx          ← session, profile (rôle), signIn, signOut, resetPassword
    routes/ProtectedRoute.jsx        ← protège les pages admin (+ option roles)
    services/<module>.js             ← TOUTES les requêtes Supabase d'un module
    components/<Nom>/<Nom>.jsx+.css  ← SplashScreen, Modal, Confirm, Table, StatCard, Toast…
    layouts/AdminLayout/             ← sidebar + entête admin
    pages/Login/
    pages/admin/<Module>/            ← Dashboard, Planning, Reservations, Studios, Clients, Caisse…
    pages/public/<Page>/             ← Home, Studios, StudioDetail, Reserver, Confirmation, Suivi
```

---

## 4. Charte graphique (couleurs extraites du logo)

- Bleu `--bleu: #002668` (principal) · Rouge `--rouge: #b4001a` (actions, accents, progression) · Fond `#f5f7fb`
- Polices Google : `Playfair Display` (grands titres) + `Montserrat` (texte)
- Toujours utiliser les variables CSS de `index.css`, jamais de couleurs en dur.
- Interface **100 % en français**, **responsive** (mobile d'abord pour réception et ménage).
- Montants en **FCFA, entiers**, affichés avec `formatFCFA()` → `25 000 FCFA`.
- Fuseau horaire : Africa/Dakar (UTC+0) — fuseau officiel de tout le Sénégal, Ziguinchor inclus.

---

## 5. Fonctionnalités complètes

### Administration
| Module | Contenu | Rôles |
|---|---|---|
| Tableau de bord | Taux d'occupation, réservations à confirmer, arrivées/départs du jour, encaissé du jour, état des studios en tuiles colorées | tous |
| Planning | Grille Gantt CSS (studios × jours/heures), vues Jour/Semaine/Mois, clic = fiche / nouvelle résa, temps réel | tous |
| Réservations | Liste filtrable, création en 3 étapes (formule+dates → studios dispo+prix → client+acompte), fiche avec cycle de vie | admin, gérant, réception (lecture comptable) |
| Clients | Recherche nom/téléphone, fiche, pièce d'identité, liste noire, historique, total dépensé | admin, gérant, réception |
| Studios & tarifs | CRUD studios, photos (Storage), équipements, prix par formule, statut rapide | admin, gérant |
| Caisse | Paiements (espèces, Wave, Orange Money, Free Money, carte, virement, PayDunya), acompte/solde/caution/remboursement, journal du jour, clôture, reçu PDF | admin, gérant, réception, comptable |
| Dépenses | Senelec, eau, internet, salaires, produits, réparations… par mois | admin, gérant, comptable |
| Rapports | CA par période/studio/formule, occupation, bénéfice net, top clients, sources, export CSV | admin, gérant, comptable |
| Ménage | Vue mobile : studios à nettoyer, Commencer/Terminé, assignation | tous |
| Maintenance | Pannes, priorité, coût, inventaire par studio | tous |
| Personnel | Activer/désactiver, rôles, création via Edge Function | admin |
| Paramètres | Coordonnées, heures check-in/out, horaires nuitée, % acompte | admin |

### Cycle de vie d'une réservation
`en_attente` → **Confirmer** → `confirmee` → **Check-in** (pièce d'identité) → `en_cours` → **Check-out** → `terminee`
Aussi : **Prolonger** (recalcul prix + vérif dispo), **Changer de studio**, **Annuler** / **No-show** (motif obligatoire).
Bouton **WhatsApp** (lien `wa.me`) avec message pré-rempli : référence, studio, dates, montant, reste à payer.

### Site public
Accueil avec recherche (formule + arrivée + départ) → studios disponibles avec prix → `/reserver` (formulaire client,
téléphone sénégalais validé) → `/confirmation/:ref` (référence + bouton WhatsApp réception) → `/suivi` (référence + téléphone).
Option : acompte en ligne via **PayDunya** (Edge Functions checkout + webhook IPN).

---

## 6. Règles métier garanties PAR LA BASE (s'appuyer dessus, ne pas les recoder en React)

1. **Aucune double réservation** : contrainte `pas_de_chevauchement`. Erreur Postgres `23P01`
   → afficher « Ce studio est déjà réservé sur cette période ».
2. **Prix** : RPC `calculer_prix(p_studio, p_formule, p_debut, p_fin)` (unités × prix ; nuitée = par nuit calendaire).
3. Check-in (`en_cours`) → studio `occupe`. Check-out (`terminee`) → studio `nettoyage` + tâche ménage créée.
   Tâche ménage `terminee` → studio `disponible`.
4. Le site public n'accède **jamais** directement à `reservations`/`clients` : uniquement via les RPC
   `studios_disponibles`, `studio_disponible`, `calculer_prix`, `creer_reservation_publique`, `suivre_reservation`.
5. Sécurité RLS par rôle avec `est_staff(array['admin','gerant']::role_staff[])`.
6. Un nouveau compte est créé **inactif** ; seul l'admin l'active. Le login refuse un compte inactif.
7. Jamais de clé `service_role` dans le front : uniquement `VITE_SUPABASE_ANON_KEY`.

### Conventions de code
- Composants fonctionnels + hooks. Fichiers en PascalCase.
- Chaque page gère 3 états : **chargement**, **erreur** (message français), **vide**.
- Formulaires : validation, bouton désactivé pendant l'envoi, message de succès.
- Actions sensibles (annuler, rembourser, supprimer) → modale de confirmation.
- Actions importantes → une ligne dans `journal_activite`.
- Pas de `supabase.from()` dans les pages : passer par `src/services/`.

---

## 7. Schéma Supabase complet (testé — à copier tel quel dans `supabase/schema.sql`)

Ce script a été testé sur PostgreSQL : création OK, double réservation bloquée, prix corrects, enchaînement
check-in → occupé → nettoyage → disponible OK. **Ne pas le modifier en Phase 0.**

```sql
-- =====================================================================
--  ZAQUIA RÉSIDENCE — Schéma Supabase (PostgreSQL)
--  À exécuter en une fois dans : Supabase > SQL Editor > New query
--  Ordre : extensions → types → tables → fonctions → triggers → RLS → données
-- =====================================================================

-- ---------- 1. EXTENSIONS ----------
create extension if not exists btree_gist;   -- anti double-réservation
create extension if not exists pgcrypto;     -- gen_random_uuid()

-- ---------- 2. TYPES (listes fermées) ----------
create type role_staff        as enum ('admin','gerant','receptionniste','menage','comptable');
create type statut_studio     as enum ('disponible','occupe','nettoyage','maintenance','hors_service');
create type formule_location  as enum ('heure','demi_journee','journee','nuitee','semaine','mois');
create type statut_reservation as enum ('en_attente','confirmee','en_cours','terminee','annulee','no_show');
create type source_reservation as enum ('site','telephone','whatsapp','sur_place','partenaire');
create type mode_paiement     as enum ('especes','wave','orange_money','free_money','carte','virement','paydunya');
create type type_paiement     as enum ('acompte','solde','caution','remboursement','extra');
create type statut_tache      as enum ('a_faire','en_cours','terminee');
create type priorite          as enum ('basse','normale','haute','urgente');

-- ---------- 3. TABLES ----------

-- Personnel (lié à auth.users)
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  role        role_staff not null default 'receptionniste',
  actif       boolean not null default false,          -- l'admin active les nouveaux comptes
  created_at  timestamptz not null default now()
);

-- Catégories de studios (ex : Studio Standard, Studio Confort, Suite)
create table categories (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null unique,
  description text,
  capacite    int  not null default 2,
  created_at  timestamptz not null default now()
);

-- Studios meublés
create table studios (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,                    -- ex : S101
  nom          text not null,                           -- ex : Studio Baobab
  categorie_id uuid references categories(id) on delete set null,
  etage        int  default 0,
  surface_m2   numeric(6,2),
  capacite     int  not null default 2,
  description  text,
  equipements  text[] not null default '{}',            -- {'Climatisation','Wifi','Cuisine équipée','TV'}
  photos       text[] not null default '{}',            -- URLs Supabase Storage (bucket "studios")
  statut       statut_studio not null default 'disponible',
  publie       boolean not null default true,           -- visible sur le site de réservation
  created_at   timestamptz not null default now()
);

-- Grille tarifaire : un prix par studio ET par formule
create table tarifs (
  id           uuid primary key default gen_random_uuid(),
  studio_id    uuid not null references studios(id) on delete cascade,
  formule      formule_location not null,
  prix         int  not null check (prix >= 0),         -- FCFA, entier (pas de centimes)
  duree_heures int  not null,                           -- heure=1, demi_journee=6, journee=12, nuitee=~18, semaine=168, mois=720
  actif        boolean not null default true,
  unique (studio_id, formule)
);

-- Clients
create table clients (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  phone         text not null,
  email         text,
  nationalite   text,
  piece_type    text,                                   -- CNI, Passeport…
  piece_numero  text,
  notes         text,
  liste_noire   boolean not null default false,
  created_at    timestamptz not null default now()
);
create index on clients (phone);

-- Réservations
create sequence reservation_seq;
create table reservations (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null unique default ('ZQ-' || to_char(now(),'YYMMDD') || '-' || lpad(nextval('reservation_seq')::text, 4, '0')),
  studio_id      uuid not null references studios(id),
  client_id      uuid not null references clients(id),
  formule        formule_location not null,
  date_debut     timestamptz not null,
  date_fin       timestamptz not null,
  nb_personnes   int not null default 1,
  statut         statut_reservation not null default 'en_attente',
  source         source_reservation not null default 'sur_place',
  montant_total  int not null default 0,                -- FCFA
  remise         int not null default 0,
  caution        int not null default 0,
  checkin_at     timestamptz,
  checkout_at    timestamptz,
  notes          text,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  check (date_fin > date_debut),
  -- 🔒 RÈGLE D'OR : impossible d'avoir 2 réservations actives qui se chevauchent sur le même studio
  constraint pas_de_chevauchement exclude using gist (
    studio_id with =,
    tstzrange(date_debut, date_fin, '[)') with &&
  ) where (statut in ('en_attente','confirmee','en_cours'))
);
create index on reservations (date_debut);
create index on reservations (statut);

-- Paiements (plusieurs par réservation : acompte, solde, caution…)
create table paiements (
  id               uuid primary key default gen_random_uuid(),
  reservation_id   uuid not null references reservations(id) on delete cascade,
  montant          int  not null check (montant > 0),
  mode             mode_paiement not null,
  type             type_paiement not null default 'solde',
  reference_transaction text,                           -- n° Wave / OM / PayDunya
  recu_par         uuid references profiles(id),
  created_at       timestamptz not null default now()
);

-- Dépenses (électricité, eau, Senelec, salaires, produits ménage…)
create table depenses (
  id          uuid primary key default gen_random_uuid(),
  categorie   text not null,
  libelle     text not null,
  montant     int  not null check (montant > 0),
  date_depense date not null default current_date,
  studio_id   uuid references studios(id) on delete set null,
  saisi_par   uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- Ménage
create table taches_menage (
  id             uuid primary key default gen_random_uuid(),
  studio_id      uuid not null references studios(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  assigne_a      uuid references profiles(id),
  statut         statut_tache not null default 'a_faire',
  notes          text,
  prevue_le      timestamptz not null default now(),
  terminee_le    timestamptz,
  created_at     timestamptz not null default now()
);

-- Maintenance / pannes
create table maintenances (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references studios(id) on delete cascade,
  titre       text not null,
  description text,
  priorite    priorite not null default 'normale',
  statut      statut_tache not null default 'a_faire',
  cout        int default 0,
  signale_par uuid references profiles(id),
  created_at  timestamptz not null default now(),
  resolu_le   timestamptz
);

-- Paramètres de la résidence (clé / valeur)
create table parametres (
  cle    text primary key,
  valeur text not null
);

-- Journal d'activité (traçabilité : qui a fait quoi)
create table journal_activite (
  id          bigserial primary key,
  user_id     uuid references profiles(id),
  action      text not null,                            -- ex : 'reservation.confirmee'
  cible_table text,
  cible_id    uuid,
  details     jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- 4. VUE : réservations avec soldes ----------
create view v_reservations with (security_invoker = true) as
select
  r.*,
  s.code  as studio_code,
  s.nom   as studio_nom,
  c.full_name as client_nom,
  c.phone     as client_phone,
  coalesce(sum(p.montant) filter (where p.type in ('acompte','solde','extra')), 0)
    - coalesce(sum(p.montant) filter (where p.type = 'remboursement'), 0) as total_paye,
  (r.montant_total - r.remise)
    - (coalesce(sum(p.montant) filter (where p.type in ('acompte','solde','extra')), 0)
       - coalesce(sum(p.montant) filter (where p.type = 'remboursement'), 0)) as reste_a_payer
from reservations r
join studios s on s.id = r.studio_id
join clients c on c.id = r.client_id
left join paiements p on p.reservation_id = r.id
group by r.id, s.code, s.nom, c.full_name, c.phone;

-- ---------- 5. FONCTIONS ----------

-- Rôle de l'utilisateur connecté (utilisé par les règles RLS)
create or replace function mon_role() returns role_staff
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and actif = true
$$;

create or replace function est_staff(roles role_staff[] default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and actif = true
      and (roles is null or role = any(roles))
  )
$$;

-- Création automatique du profil à l'inscription
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'phone');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Calcul du prix : nb d'unités de la formule × prix unitaire (arrondi supérieur)
create or replace function calculer_prix(p_studio uuid, p_formule formule_location, p_debut timestamptz, p_fin timestamptz)
returns int language plpgsql stable security definer set search_path = public as $$
declare t tarifs%rowtype; unites int;
begin
  select * into t from tarifs where studio_id = p_studio and formule = p_formule and actif;
  if not found then raise exception 'Aucun tarif "%" pour ce studio', p_formule; end if;
  unites := greatest(1, ceil(extract(epoch from (p_fin - p_debut)) / 3600.0 / t.duree_heures));
  -- la nuitée se compte par nuit calendaire
  if p_formule = 'nuitee' then
    unites := greatest(1, (p_fin::date - p_debut::date));
  end if;
  return unites * t.prix;
end $$;

-- Disponibilité (appelable par le site public, sans exposer les réservations)
create or replace function studio_disponible(p_studio uuid, p_debut timestamptz, p_fin timestamptz)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from reservations
    where studio_id = p_studio
      and statut in ('en_attente','confirmee','en_cours')
      and tstzrange(date_debut, date_fin, '[)') && tstzrange(p_debut, p_fin, '[)')
  ) and exists (select 1 from studios where id = p_studio and statut <> 'hors_service' and publie)
$$;

-- Liste des studios libres sur une période (site public)
create or replace function studios_disponibles(p_debut timestamptz, p_fin timestamptz)
returns setof studios language sql stable security definer set search_path = public as $$
  select s.* from studios s
  where s.publie and s.statut <> 'hors_service'
    and studio_disponible(s.id, p_debut, p_fin)
  order by s.code
$$;

-- Réservation depuis le site public → statut "en_attente", retourne la référence
create or replace function creer_reservation_publique(
  p_studio uuid, p_formule formule_location, p_debut timestamptz, p_fin timestamptz,
  p_nom text, p_phone text, p_email text default null, p_nb_personnes int default 1, p_notes text default null
) returns table (reference text, montant int)
language plpgsql security definer set search_path = public as $$
declare v_client uuid; v_montant int; v_ref text;
begin
  if p_debut < now() - interval '15 minutes' then raise exception 'La date de début est passée'; end if;
  if not studio_disponible(p_studio, p_debut, p_fin) then raise exception 'Studio non disponible sur cette période'; end if;

  select id into v_client from clients where phone = p_phone limit 1;
  if v_client is null then
    insert into clients (full_name, phone, email) values (p_nom, p_phone, p_email) returning id into v_client;
  end if;
  if (select liste_noire from clients where id = v_client) then
    raise exception 'Réservation impossible, merci de contacter la réception';
  end if;

  v_montant := calculer_prix(p_studio, p_formule, p_debut, p_fin);

  insert into reservations (studio_id, client_id, formule, date_debut, date_fin, nb_personnes, source, montant_total, notes)
  values (p_studio, v_client, p_formule, p_debut, p_fin, p_nb_personnes, 'site', v_montant, p_notes)
  returning reservations.reference into v_ref;

  return query select v_ref, v_montant;
end $$;

-- Suivi d'une réservation par le client (référence + téléphone)
create or replace function suivre_reservation(p_reference text, p_phone text)
returns table (reference text, studio text, formule formule_location, date_debut timestamptz,
               date_fin timestamptz, statut statut_reservation, montant_total int)
language sql stable security definer set search_path = public as $$
  select r.reference, s.nom, r.formule, r.date_debut, r.date_fin, r.statut, r.montant_total
  from reservations r join studios s on s.id = r.studio_id join clients c on c.id = r.client_id
  where r.reference = upper(trim(p_reference)) and c.phone = trim(p_phone)
$$;

-- Synchronise le statut du studio avec le check-in / check-out
create or replace function sync_statut_studio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.statut = 'en_cours' and old.statut is distinct from 'en_cours' then
    update studios set statut = 'occupe' where id = new.studio_id;
    new.checkin_at := coalesce(new.checkin_at, now());
  elsif new.statut = 'terminee' and old.statut = 'en_cours' then
    update studios set statut = 'nettoyage' where id = new.studio_id;
    new.checkout_at := coalesce(new.checkout_at, now());
    insert into taches_menage (studio_id, reservation_id) values (new.studio_id, new.id);
  end if;
  return new;
end $$;

create trigger trg_sync_statut_studio
  before update of statut on reservations
  for each row execute function sync_statut_studio();

-- Ménage terminé → studio redevient disponible
create or replace function menage_termine() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.statut = 'terminee' and old.statut <> 'terminee' then
    new.terminee_le := now();
    update studios set statut = 'disponible' where id = new.studio_id and statut = 'nettoyage';
  end if;
  return new;
end $$;

create trigger trg_menage_termine
  before update of statut on taches_menage
  for each row execute function menage_termine();

-- ---------- 6. SÉCURITÉ (Row Level Security) ----------
alter table profiles         enable row level security;
alter table categories       enable row level security;
alter table studios          enable row level security;
alter table tarifs           enable row level security;
alter table clients          enable row level security;
alter table reservations     enable row level security;
alter table paiements        enable row level security;
alter table depenses         enable row level security;
alter table taches_menage    enable row level security;
alter table maintenances     enable row level security;
alter table parametres       enable row level security;
alter table journal_activite enable row level security;

-- Profils : chacun voit le sien, l'admin voit et gère tout
create policy "profil: lire le sien"   on profiles for select using (id = auth.uid() or est_staff(array['admin','gerant']::role_staff[]));
create policy "profil: admin modifie"  on profiles for update using (est_staff(array['admin']::role_staff[]));

-- Public (site) : lecture des studios publiés, catégories, tarifs actifs, paramètres
create policy "public: studios publiés" on studios    for select using (publie or est_staff());
create policy "public: catégories"      on categories for select using (true);
create policy "public: tarifs actifs"   on tarifs     for select using (actif or est_staff());
create policy "public: paramètres"      on parametres for select using (true);

-- Gestion catalogue : admin / gérant
create policy "gestion studios"    on studios    for all using (est_staff(array['admin','gerant']::role_staff[])) with check (est_staff(array['admin','gerant']::role_staff[]));
create policy "gestion catégories" on categories for all using (est_staff(array['admin','gerant']::role_staff[])) with check (est_staff(array['admin','gerant']::role_staff[]));
create policy "gestion tarifs"     on tarifs     for all using (est_staff(array['admin','gerant']::role_staff[])) with check (est_staff(array['admin','gerant']::role_staff[]));
create policy "gestion paramètres" on parametres for all using (est_staff(array['admin']::role_staff[]))          with check (est_staff(array['admin']::role_staff[]));
-- Le ménage peut changer le statut d'un studio (nettoyage → disponible)
create policy "ménage: statut studio" on studios for update using (est_staff(array['menage']::role_staff[]));

-- Clients & réservations : réception, gérant, admin (lecture aussi comptable)
create policy "clients: lecture"     on clients for select using (est_staff(array['admin','gerant','receptionniste','comptable']::role_staff[]));
create policy "clients: écriture"    on clients for insert with check (est_staff(array['admin','gerant','receptionniste']::role_staff[]));
create policy "clients: modif"       on clients for update using (est_staff(array['admin','gerant','receptionniste']::role_staff[]));

create policy "résa: lecture"        on reservations for select using (est_staff());
create policy "résa: création"       on reservations for insert with check (est_staff(array['admin','gerant','receptionniste']::role_staff[]));
create policy "résa: modif"          on reservations for update using (est_staff(array['admin','gerant','receptionniste']::role_staff[]));
create policy "résa: suppression"    on reservations for delete using (est_staff(array['admin']::role_staff[]));

-- Argent : paiements & dépenses
create policy "paiements: lecture"   on paiements for select using (est_staff(array['admin','gerant','receptionniste','comptable']::role_staff[]));
create policy "paiements: création"  on paiements for insert with check (est_staff(array['admin','gerant','receptionniste']::role_staff[]));
create policy "paiements: admin"     on paiements for delete using (est_staff(array['admin']::role_staff[]));
create policy "dépenses: lecture"    on depenses  for select using (est_staff(array['admin','gerant','comptable']::role_staff[]));
create policy "dépenses: écriture"   on depenses  for all    using (est_staff(array['admin','gerant','comptable']::role_staff[])) with check (est_staff(array['admin','gerant','comptable']::role_staff[]));

-- Opérations : ménage & maintenance (tout le staff)
create policy "ménage: tout staff"      on taches_menage for all using (est_staff()) with check (est_staff());
create policy "maintenance: tout staff" on maintenances  for all using (est_staff()) with check (est_staff());

-- Journal : écrit par le staff, lu par l'admin
create policy "journal: écriture" on journal_activite for insert with check (est_staff());
create policy "journal: lecture"  on journal_activite for select using (est_staff(array['admin']::role_staff[]));

-- Fonctions publiques appelables par le site (visiteur non connecté)
grant execute on function studios_disponibles(timestamptz, timestamptz)        to anon, authenticated;
grant execute on function studio_disponible(uuid, timestamptz, timestamptz)    to anon, authenticated;
grant execute on function calculer_prix(uuid, formule_location, timestamptz, timestamptz) to anon, authenticated;
grant execute on function creer_reservation_publique(uuid, formule_location, timestamptz, timestamptz, text, text, text, int, text) to anon, authenticated;
grant execute on function suivre_reservation(text, text)                       to anon, authenticated;

-- ---------- 7. DONNÉES DE DÉPART ----------
insert into parametres (cle, valeur) values
  ('nom_residence',      'Zaquia Résidence'),
  ('telephone',          '+221 77 000 00 00'),
  ('whatsapp',           '221770000000'),
  ('adresse',            'Dakar, Sénégal'),
  ('heure_checkin',      '14:00'),
  ('heure_checkout',     '12:00'),
  ('nuitee_debut',       '18:00'),
  ('nuitee_fin',         '12:00'),
  ('acompte_pourcent',   '30'),
  ('devise',             'FCFA');

insert into categories (nom, description, capacite) values
  ('Studio Standard', 'Studio meublé avec kitchenette', 2),
  ('Studio Confort',  'Studio meublé spacieux, balcon',  2),
  ('Suite',           'Grand studio, salon séparé',      4);

-- Exemple : 1 studio + sa grille de prix (à adapter / supprimer)
with s as (
  insert into studios (code, nom, categorie_id, etage, capacite, equipements)
  select 'S101', 'Studio Baobab', id, 1, 2, array['Climatisation','Wifi','TV','Cuisine équipée','Eau chaude']
  from categories where nom = 'Studio Standard'
  returning id
)
insert into tarifs (studio_id, formule, prix, duree_heures)
select s.id, f.formule::formule_location, f.prix, f.duree from s, (values
  ('heure',         5000,   1),
  ('demi_journee', 15000,   6),
  ('journee',      20000,  12),
  ('nuitee',       25000,  18),
  ('semaine',     150000, 168),
  ('mois',        450000, 720)
) as f(formule, prix, duree);

-- ---------- 8. PREMIER ADMIN ----------
-- 1) Créez votre compte dans Supabase > Authentication > Users > Add user
-- 2) Puis exécutez (en remplaçant l'email) :
-- update profiles set role = 'admin', actif = true, full_name = 'Ousmane'
-- where id = (select id from auth.users where email = 'votre@email.com');
```

---

## 8. Code de référence (déjà validé — à créer à l'identique en Phase 0)

Ces fichiers ont été testés (build OK, rendu vérifié). Crée-les exactement ainsi.

#### `package.json`
```json
{
  "name": "zaquia-residence",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0"
  }
}
```

#### `vite.config.js`
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
```

#### `index.html`
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/logo-zaquia.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#002668" />
    <title>Zaquia Résidence</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

#### `.env.example`
```bash
# Copiez ce fichier en ".env" puis remplissez avec vos clés
# Supabase > Project Settings > API
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

#### `.gitignore`
```
node_modules
dist
.env
.DS_Store
```

#### `src/main.jsx`
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

#### `src/index.css`
```css
/* ===== Charte Zaquia Résidence (couleurs extraites du logo) ===== */
:root {
  --bleu: #002668;
  --bleu-fonce: #001a4a;
  --bleu-clair: #e8edf7;
  --rouge: #b4001a;
  --rouge-fonce: #8c0014;
  --rouge-clair: #fbe9ec;

  --blanc: #ffffff;
  --fond: #f5f7fb;
  --texte: #1b1f2a;
  --texte-doux: #5b6475;
  --bordure: #dfe4ee;

  --succes: #1e8e4e;
  --alerte: #d98a00;

  --police-titre: 'Playfair Display', Georgia, serif;
  --police: 'Montserrat', system-ui, -apple-system, 'Segoe UI', sans-serif;

  --radius: 12px;
  --radius-sm: 8px;
  --ombre: 0 6px 24px rgba(0, 38, 104, 0.08);
}

*, *::before, *::after { box-sizing: border-box; }

html, body, #root { height: 100%; }

body {
  margin: 0;
  font-family: var(--police);
  color: var(--texte);
  background: var(--fond);
  -webkit-font-smoothing: antialiased;
}

a { color: var(--bleu); }
button { font-family: inherit; cursor: pointer; }
input, select, textarea { font-family: inherit; font-size: 1rem; }

/* Boutons réutilisables */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px 20px; border: none; border-radius: var(--radius-sm);
  font-weight: 600; font-size: 0.95rem; transition: background .2s, transform .1s;
}
.btn:active { transform: scale(0.98); }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn-primaire { background: var(--bleu); color: var(--blanc); }
.btn-primaire:hover:not(:disabled) { background: var(--bleu-fonce); }
.btn-rouge { background: var(--rouge); color: var(--blanc); }
.btn-rouge:hover:not(:disabled) { background: var(--rouge-fonce); }
.btn-contour { background: transparent; color: var(--bleu); border: 1.5px solid var(--bleu); }

/* Champs de formulaire */
.champ { display: flex; flex-direction: column; gap: 6px; }
.champ label { font-size: .85rem; font-weight: 600; color: var(--texte-doux); }
.champ input, .champ select, .champ textarea {
  padding: 12px 14px; border: 1.5px solid var(--bordure); border-radius: var(--radius-sm);
  background: var(--blanc); outline: none; transition: border-color .2s;
}
.champ input:focus, .champ select:focus, .champ textarea:focus { border-color: var(--bleu); }

/* Badges de statut */
.badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: .75rem; font-weight: 600; }
.badge-en_attente  { background: #fff4dc; color: var(--alerte); }
.badge-confirmee   { background: var(--bleu-clair); color: var(--bleu); }
.badge-en_cours    { background: #e3f6ec; color: var(--succes); }
.badge-terminee    { background: #eceff4; color: var(--texte-doux); }
.badge-annulee, .badge-no_show { background: var(--rouge-clair); color: var(--rouge); }
```

#### `src/App.jsx`
```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen/SplashScreen.jsx';
import Login from './pages/Login/Login.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard/Dashboard.jsx';
import Home from './pages/public/Home/Home.jsx';
import EnConstruction from './components/EnConstruction.jsx';

export default function App() {
  return (
    <Routes>
      {/* ===== SITE PUBLIC DE RÉSERVATION ===== */}
      <Route path="/" element={<Home />} />
      {/* À venir : /studios, /studios/:id, /reserver, /confirmation/:ref, /suivi */}

      {/* ===== APPLICATION D'ADMINISTRATION ===== */}
      <Route path="/admin" element={<SplashScreen />} />
      <Route path="/admin/login" element={<Login />} />

      {/* Pages protégées (connexion obligatoire) */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/planning" element={<EnConstruction titre="Planning" />} />
        <Route path="/admin/reservations" element={<EnConstruction titre="Réservations" />} />
        <Route path="/admin/studios" element={<EnConstruction titre="Studios & tarifs" />} />
        <Route path="/admin/clients" element={<EnConstruction titre="Clients" />} />
        <Route path="/admin/caisse" element={<EnConstruction titre="Caisse & paiements" />} />
        <Route path="/admin/depenses" element={<EnConstruction titre="Dépenses" />} />
        <Route path="/admin/menage" element={<EnConstruction titre="Ménage" />} />
        <Route path="/admin/maintenance" element={<EnConstruction titre="Maintenance" />} />
        <Route path="/admin/rapports" element={<EnConstruction titre="Rapports" />} />
        <Route path="/admin/personnel" element={<EnConstruction titre="Personnel" />} />
        <Route path="/admin/parametres" element={<EnConstruction titre="Paramètres" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

#### `src/components/EnConstruction.jsx`
```jsx
export default function EnConstruction({ titre }) {
  return (
    <div style={{ padding: 32, background: 'var(--blanc)', borderRadius: 'var(--radius)', boxShadow: 'var(--ombre)' }}>
      <h2 style={{ marginTop: 0, color: 'var(--bleu)' }}>{titre}</h2>
      <p style={{ color: 'var(--texte-doux)' }}>Module à construire — voir docs/ETAPES.md.</p>
    </div>
  );
}
```

#### `src/lib/supabase.js`
```js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('⚠️ Clés Supabase manquantes : copiez .env.example en .env et remplissez-le.');
}

export const supabase = createClient(url ?? 'http://localhost', key ?? 'public-anon-key');
```

#### `src/lib/format.js`
```js
// Fonctions utilitaires d'affichage — réutilisées partout dans l'app

export const formatFCFA = (montant) =>
  new Intl.NumberFormat('fr-FR').format(montant ?? 0) + ' FCFA';

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatDateHeure = (d) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const FORMULES = {
  heure: 'À l’heure',
  demi_journee: 'Demi-journée',
  journee: 'Journée',
  nuitee: 'Nuitée',
  semaine: 'Semaine',
  mois: 'Mois',
};

export const STATUTS_RESERVATION = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
  no_show: 'Non présenté',
};

export const STATUTS_STUDIO = {
  disponible: 'Disponible',
  occupe: 'Occupé',
  nettoyage: 'Nettoyage',
  maintenance: 'Maintenance',
  hors_service: 'Hors service',
};

export const MODES_PAIEMENT = {
  especes: 'Espèces',
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  carte: 'Carte bancaire',
  virement: 'Virement',
  paydunya: 'PayDunya (en ligne)',
};
```

#### `src/context/AuthContext.jsx`
```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charge le profil (rôle, nom, actif) de l'utilisateur connecté
  const chargerProfil = async (user) => {
    if (!user) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await chargerProfil(data.session?.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // setTimeout évite un blocage connu de supabase-js dans ce callback
      setTimeout(() => chargerProfil(newSession?.user), 0);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    if (!p?.actif) {
      await supabase.auth.signOut();
      throw new Error('Votre compte n’est pas encore activé par l’administrateur.');
    }
    setProfile(p);
    return p;
  };

  const signOut = () => supabase.auth.signOut();

  const resetPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/login` });

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

#### `src/routes/ProtectedRoute.jsx`
```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// roles (optionnel) : ex. ['admin','gerant'] pour restreindre une page
export default function ProtectedRoute({ children, roles }) {
  const { session, profile, loading } = useAuth();

  if (loading) return null;
  if (!session || (profile && !profile.actif)) return <Navigate to="/admin/login" replace />;
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/admin/dashboard" replace />;

  return children;
}
```

#### `src/components/SplashScreen/SplashScreen.jsx`
```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './SplashScreen.css';

/**
 * Écran d'ouverture de l'Administration.
 * La barre ROUGE se remplit progressivement par-dessus la barre BLEUE.
 * Quand elle atteint 100 %, on ouvre la page de connexion
 * (ou directement le tableau de bord si l'utilisateur est déjà connecté).
 */
const DUREE_MS = 3000; // durée totale du chargement

export default function SplashScreen() {
  const [progression, setProgression] = useState(0);
  const [sortie, setSortie] = useState(false);
  const navigate = useNavigate();
  const { session, profile, loading } = useAuth();

  // Animation fluide de 0 à 100 % avec requestAnimationFrame
  useEffect(() => {
    let debut = null;
    let frame;
    const animer = (t) => {
      if (debut === null) debut = t;
      const ratio = Math.min((t - debut) / DUREE_MS, 1);
      // easing : démarre vite, ralentit à la fin (effet "chargement réel")
      const eased = 1 - Math.pow(1 - ratio, 2.2);
      setProgression(Math.round(eased * 100));
      if (ratio < 1) frame = requestAnimationFrame(animer);
    };
    frame = requestAnimationFrame(animer);
    return () => cancelAnimationFrame(frame);
  }, []);

  // À 100 % (et session vérifiée) → fondu puis redirection
  useEffect(() => {
    if (progression < 100 || loading) return;
    setSortie(true);
    const destination = session && profile?.actif ? '/admin/dashboard' : '/admin/login';
    const timer = setTimeout(() => navigate(destination, { replace: true }), 450);
    return () => clearTimeout(timer);
  }, [progression, loading, session, profile, navigate]);

  return (
    <div className={`splash ${sortie ? 'splash--sortie' : ''}`}>
      <img src="/logo-zaquia.png" alt="Zaquia Résidence" className="splash__logo" />

      <h1 className="splash__titre">Administration</h1>

      <div
        className="splash__barre"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progression}
        aria-label="Chargement de l'application"
      >
        <div className="splash__remplissage" style={{ width: `${progression}%` }} />
      </div>

      <p className="splash__texte">
        loading<span className="splash__points"><span>.</span><span>.</span><span>.</span><span>.</span></span>
      </p>
    </div>
  );
}
```

#### `src/components/SplashScreen/SplashScreen.css`
```css
.splash {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 24px;
  background: var(--blanc);
  transition: opacity .45s ease, transform .45s ease;
}

.splash--sortie {
  opacity: 0;
  transform: scale(1.03);
}

.splash__logo {
  width: min(300px, 70vw);
  height: auto;
  animation: splash-apparition .8s ease-out both;
}

.splash__titre {
  margin: 8px 0 0;
  font-family: var(--police);
  font-weight: 500;
  font-size: clamp(1.8rem, 5vw, 2.6rem);
  color: var(--texte);
  animation: splash-apparition .8s .15s ease-out both;
}

/* Barre BLEUE = le fond (le "vide") */
.splash__barre {
  width: min(760px, 88vw);
  height: 40px;
  border-radius: 999px;
  background: var(--bleu);
  overflow: hidden;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, .25);
}

/* Barre ROUGE = la progression, qui avance de gauche à droite */
.splash__remplissage {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--rouge-fonce), var(--rouge));
  position: relative;
  overflow: hidden;
}

/* Reflet lumineux qui glisse sur la barre rouge */
.splash__remplissage::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,.35) 50%, transparent 70%);
  animation: splash-reflet 1.2s linear infinite;
}

.splash__texte {
  margin: 0;
  font-size: clamp(1.4rem, 4vw, 2.2rem);
  color: var(--texte);
}

.splash__points span {
  animation: splash-point 1.2s infinite;
  opacity: 0;
}
.splash__points span:nth-child(2) { animation-delay: .15s; }
.splash__points span:nth-child(3) { animation-delay: .3s; }
.splash__points span:nth-child(4) { animation-delay: .45s; }

@keyframes splash-apparition {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes splash-reflet {
  from { transform: translateX(-100%); }
  to   { transform: translateX(100%); }
}

@keyframes splash-point {
  0%, 20%  { opacity: 0; }
  40%, 80% { opacity: 1; }
  100%     { opacity: 0; }
}

@media (max-width: 480px) {
  .splash__barre { height: 26px; }
}
```

#### `src/pages/Login/Login.jsx`
```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './Login.css';

// Traduction des erreurs Supabase les plus fréquentes
const traduireErreur = (msg = '') => {
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (msg.includes('Email not confirmed')) return 'Veuillez confirmer votre email avant de vous connecter.';
  if (msg.includes('Failed to fetch')) return 'Connexion impossible. Vérifiez votre internet.';
  return msg || 'Une erreur est survenue.';
};

export default function Login() {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voirMdp, setVoirMdp] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur(''); setInfo('');
    setChargement(true);
    try {
      await signIn(email.trim(), password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setErreur(traduireErreur(err.message));
    } finally {
      setChargement(false);
    }
  };

  const handleMotDePasseOublie = async () => {
    setErreur(''); setInfo('');
    if (!email) return setErreur('Saisissez d’abord votre email.');
    const { error } = await resetPassword(email.trim());
    if (error) setErreur(traduireErreur(error.message));
    else setInfo('Un lien de réinitialisation vous a été envoyé par email.');
  };

  return (
    <div className="login">
      {/* Panneau gauche : identité visuelle */}
      <aside className="login__visuel">
        <div className="login__visuel-contenu">
          <h2>Gérez votre résidence<br />en toute sérénité.</h2>
          <p>Réservations, planning, caisse, ménage et rapports — au même endroit.</p>
        </div>
        <div className="login__bandes"><span /><span /><span /></div>
      </aside>

      {/* Panneau droit : formulaire */}
      <main className="login__panneau">
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <img src="/logo-zaquia.png" alt="Zaquia Résidence" className="login__logo" />
          <h1>Connexion</h1>
          <p className="login__sous-titre">Espace d’administration</p>

          {erreur && <div className="login__alerte login__alerte--erreur">{erreur}</div>}
          {info && <div className="login__alerte login__alerte--info">{info}</div>}

          <div className="champ">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" placeholder="vous@zaquia.sn"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="champ">
            <label htmlFor="password">Mot de passe</label>
            <div className="login__mdp">
              <input id="password" type={voirMdp ? 'text' : 'password'} autoComplete="current-password"
                placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="login__oeil" onClick={() => setVoirMdp(!voirMdp)}>
                {voirMdp ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          <button type="button" className="login__oublie" onClick={handleMotDePasseOublie}>
            Mot de passe oublié ?
          </button>

          <button type="submit" className="btn btn-rouge login__submit" disabled={chargement || !email || !password}>
            {chargement ? 'Connexion…' : 'Se connecter'}
          </button>

          <p className="login__pied">© {new Date().getFullYear()} Zaquia Résidence</p>
        </form>
      </main>
    </div>
  );
}
```

#### `src/pages/Login/Login.css`
```css
.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  animation: login-fondu .5s ease-out;
}

/* ---- Panneau visuel ---- */
.login__visuel {
  position: relative;
  overflow: hidden;
  background: linear-gradient(150deg, var(--bleu) 0%, var(--bleu-fonce) 100%);
  color: var(--blanc);
  display: flex;
  align-items: flex-end;
  padding: 56px;
}
.login__visuel-contenu { position: relative; z-index: 1; max-width: 440px; }
.login__visuel h2 {
  font-family: var(--police-titre);
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  line-height: 1.2;
  margin: 0 0 16px;
}
.login__visuel p { margin: 0; opacity: .85; line-height: 1.6; }

/* Bandes verticales rappelant l'immeuble du logo */
.login__bandes {
  position: absolute; top: 12%; right: 12%;
  display: flex; align-items: flex-end; gap: 14px; height: 50%;
}
.login__bandes span { width: 22px; border-radius: 4px 4px 0 0; background: rgba(255,255,255,.12); }
.login__bandes span:nth-child(1) { height: 60%; background: var(--rouge); }
.login__bandes span:nth-child(2) { height: 85%; }
.login__bandes span:nth-child(3) { height: 100%; }

/* ---- Panneau formulaire ---- */
.login__panneau {
  display: flex; align-items: center; justify-content: center;
  padding: 32px 24px; background: var(--blanc);
}
.login__form { width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 18px; }
.login__logo { width: 150px; align-self: center; margin-bottom: 4px; }
.login__form h1 { margin: 0; text-align: center; color: var(--bleu); font-size: 1.6rem; }
.login__sous-titre { margin: -12px 0 6px; text-align: center; color: var(--texte-doux); font-size: .9rem; }

.login__alerte { padding: 12px 14px; border-radius: var(--radius-sm); font-size: .9rem; }
.login__alerte--erreur { background: var(--rouge-clair); color: var(--rouge); }
.login__alerte--info   { background: var(--bleu-clair); color: var(--bleu); }

.login__mdp { position: relative; }
.login__mdp input { width: 100%; padding-right: 86px; }
.login__oeil {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: var(--bleu); font-size: .8rem; font-weight: 600; padding: 6px;
}

.login__oublie {
  align-self: flex-end; margin-top: -8px;
  background: none; border: none; color: var(--rouge); font-size: .85rem; font-weight: 600; padding: 0;
}
.login__submit { width: 100%; padding: 14px; font-size: 1rem; }
.login__pied { text-align: center; color: var(--texte-doux); font-size: .8rem; margin: 8px 0 0; }

@keyframes login-fondu { from { opacity: 0; } to { opacity: 1; } }

@media (max-width: 860px) {
  .login { grid-template-columns: 1fr; }
  .login__visuel { display: none; }
}
```

#### `src/layouts/AdminLayout/AdminLayout.jsx`
```jsx
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './AdminLayout.css';

// Menu : "roles" = qui voit l'entrée (absent = tout le personnel)
const MENU = [
  { to: '/admin/dashboard',    label: 'Tableau de bord' },
  { to: '/admin/planning',     label: 'Planning' },
  { to: '/admin/reservations', label: 'Réservations', roles: ['admin','gerant','receptionniste','comptable'] },
  { to: '/admin/clients',      label: 'Clients',      roles: ['admin','gerant','receptionniste'] },
  { to: '/admin/studios',      label: 'Studios & tarifs', roles: ['admin','gerant'] },
  { to: '/admin/caisse',       label: 'Caisse',       roles: ['admin','gerant','receptionniste','comptable'] },
  { to: '/admin/depenses',     label: 'Dépenses',     roles: ['admin','gerant','comptable'] },
  { to: '/admin/menage',       label: 'Ménage' },
  { to: '/admin/maintenance',  label: 'Maintenance' },
  { to: '/admin/rapports',     label: 'Rapports',     roles: ['admin','gerant','comptable'] },
  { to: '/admin/personnel',    label: 'Personnel',    roles: ['admin'] },
  { to: '/admin/parametres',   label: 'Paramètres',   roles: ['admin'] },
];

const ROLES = {
  admin: 'Administrateur', gerant: 'Gérant', receptionniste: 'Réception',
  menage: 'Ménage', comptable: 'Comptable',
};

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOuvert, setMenuOuvert] = useState(false);

  const items = MENU.filter((m) => !m.roles || m.roles.includes(profile?.role));

  const deconnexion = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin">
      <aside className={`admin__sidebar ${menuOuvert ? 'admin__sidebar--ouvert' : ''}`}>
        <div className="admin__marque">
          <img src="/logo-zaquia.png" alt="Zaquia Résidence" />
        </div>
        <nav className="admin__nav">
          {items.map((m) => (
            <NavLink key={m.to} to={m.to} onClick={() => setMenuOuvert(false)}
              className={({ isActive }) => `admin__lien ${isActive ? 'admin__lien--actif' : ''}`}>
              {m.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {menuOuvert && <div className="admin__voile" onClick={() => setMenuOuvert(false)} />}

      <div className="admin__principal">
        <header className="admin__entete">
          <button className="admin__burger" onClick={() => setMenuOuvert(true)} aria-label="Ouvrir le menu">☰</button>
          <div className="admin__utilisateur">
            <div>
              <strong>{profile?.full_name || 'Utilisateur'}</strong>
              <span>{ROLES[profile?.role] ?? ''}</span>
            </div>
            <button className="btn btn-contour" onClick={deconnexion}>Déconnexion</button>
          </div>
        </header>
        <main className="admin__contenu">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

#### `src/layouts/AdminLayout/AdminLayout.css`
```css
.admin { display: flex; min-height: 100vh; }

.admin__sidebar {
  width: 250px; flex-shrink: 0;
  background: var(--bleu); color: var(--blanc);
  display: flex; flex-direction: column;
  position: sticky; top: 0; height: 100vh; overflow-y: auto;
}
.admin__marque { background: var(--blanc); padding: 18px; display: flex; justify-content: center; border-bottom: 4px solid var(--rouge); }
.admin__marque img { width: 130px; }

.admin__nav { display: flex; flex-direction: column; padding: 16px 12px; gap: 4px; }
.admin__lien {
  color: rgba(255,255,255,.8); text-decoration: none;
  padding: 11px 14px; border-radius: var(--radius-sm); font-size: .92rem; font-weight: 500;
  border-left: 3px solid transparent; transition: background .2s;
}
.admin__lien:hover { background: rgba(255,255,255,.08); color: var(--blanc); }
.admin__lien--actif { background: rgba(255,255,255,.12); color: var(--blanc); border-left-color: var(--rouge); font-weight: 600; }

.admin__principal { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.admin__entete {
  height: 68px; background: var(--blanc); border-bottom: 1px solid var(--bordure);
  display: flex; align-items: center; justify-content: space-between; padding: 0 24px;
  position: sticky; top: 0; z-index: 5;
}
.admin__burger { display: none; background: none; border: none; font-size: 1.5rem; color: var(--bleu); }
.admin__utilisateur { margin-left: auto; display: flex; align-items: center; gap: 16px; }
.admin__utilisateur div { display: flex; flex-direction: column; text-align: right; }
.admin__utilisateur span { font-size: .78rem; color: var(--texte-doux); }
.admin__utilisateur .btn { padding: 8px 14px; }

.admin__contenu { padding: 28px; }
.admin__voile { display: none; }

@media (max-width: 900px) {
  .admin__sidebar { position: fixed; left: 0; z-index: 20; transform: translateX(-100%); transition: transform .25s; }
  .admin__sidebar--ouvert { transform: translateX(0); }
  .admin__voile { display: block; position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 15; }
  .admin__burger { display: block; }
  .admin__contenu { padding: 18px; }
  .admin__utilisateur div { display: none; }
}
```

#### `src/pages/admin/Dashboard/Dashboard.jsx`
```jsx
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { formatFCFA, formatDateHeure, FORMULES, STATUTS_RESERVATION, STATUTS_STUDIO } from '../../../lib/format.js';
import './Dashboard.css';

export default function Dashboard() {
  const [studios, setStudios] = useState([]);
  const [arrivees, setArrivees] = useState([]);
  const [departs, setDeparts] = useState([]);
  const [enAttente, setEnAttente] = useState(0);
  const [encaisseJour, setEncaisseJour] = useState(0);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const charger = async () => {
      const debutJour = new Date(); debutJour.setHours(0, 0, 0, 0);
      const finJour = new Date(); finJour.setHours(23, 59, 59, 999);

      const [s, a, d, att, p] = await Promise.all([
        supabase.from('studios').select('id, code, nom, statut').order('code'),
        supabase.from('v_reservations').select('*').in('statut', ['confirmee', 'en_attente'])
          .gte('date_debut', debutJour.toISOString()).lte('date_debut', finJour.toISOString()).order('date_debut'),
        supabase.from('v_reservations').select('*').eq('statut', 'en_cours')
          .lte('date_fin', finJour.toISOString()).order('date_fin'),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente'),
        supabase.from('paiements').select('montant, type').gte('created_at', debutJour.toISOString()),
      ]);

      setStudios(s.data ?? []);
      setArrivees(a.data ?? []);
      setDeparts(d.data ?? []);
      setEnAttente(att.count ?? 0);
      setEncaisseJour((p.data ?? []).reduce((t, x) => t + (x.type === 'remboursement' ? -x.montant : x.type === 'caution' ? 0 : x.montant), 0));
      setChargement(false);
    };
    charger();
  }, []);

  const occupes = studios.filter((s) => s.statut === 'occupe').length;
  const taux = studios.length ? Math.round((occupes / studios.length) * 100) : 0;

  return (
    <div className="dash">
      <h1 className="dash__titre">Tableau de bord</h1>

      <section className="dash__kpis">
        <div className="kpi"><span>Taux d’occupation</span><strong>{taux} %</strong><small>{occupes} / {studios.length} studios</small></div>
        <div className="kpi kpi--rouge"><span>À confirmer</span><strong>{enAttente}</strong><small>réservations en attente</small></div>
        <div className="kpi"><span>Arrivées du jour</span><strong>{arrivees.length}</strong><small>check-in prévus</small></div>
        <div className="kpi"><span>Encaissé aujourd’hui</span><strong>{formatFCFA(encaisseJour)}</strong><small>hors cautions</small></div>
      </section>

      <section className="dash__grille">
        <div className="carte">
          <h2>État des studios</h2>
          {chargement ? <p className="vide">Chargement…</p> : (
            <div className="dash__studios">
              {studios.map((s) => (
                <div key={s.id} className={`studio-tuile studio-tuile--${s.statut}`}>
                  <strong>{s.code}</strong>
                  <span>{STATUTS_STUDIO[s.statut]}</span>
                </div>
              ))}
              {!studios.length && <p className="vide">Aucun studio enregistré.</p>}
            </div>
          )}
        </div>

        <div className="carte">
          <h2>Arrivées du jour</h2>
          <ListeResa items={arrivees} champDate="date_debut" vide="Aucune arrivée prévue." />
        </div>

        <div className="carte">
          <h2>Départs du jour</h2>
          <ListeResa items={departs} champDate="date_fin" vide="Aucun départ prévu." />
        </div>
      </section>
    </div>
  );
}

function ListeResa({ items, champDate, vide }) {
  if (!items.length) return <p className="vide">{vide}</p>;
  return (
    <ul className="dash__liste">
      {items.map((r) => (
        <li key={r.id}>
          <div>
            <strong>{r.client_nom}</strong>
            <span>{r.studio_code} · {FORMULES[r.formule]} · {formatDateHeure(r[champDate])}</span>
          </div>
          <div className="dash__liste-droite">
            <span className={`badge badge-${r.statut}`}>{STATUTS_RESERVATION[r.statut]}</span>
            {r.reste_a_payer > 0 && <small>Reste {formatFCFA(r.reste_a_payer)}</small>}
          </div>
        </li>
      ))}
    </ul>
  );
}
```

#### `src/pages/admin/Dashboard/Dashboard.css`
```css
.dash__titre { margin: 0 0 22px; color: var(--bleu); font-size: 1.6rem; }

.dash__kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 22px; }
.kpi {
  background: var(--blanc); border-radius: var(--radius); box-shadow: var(--ombre);
  padding: 18px 20px; display: flex; flex-direction: column; gap: 4px; border-top: 4px solid var(--bleu);
}
.kpi--rouge { border-top-color: var(--rouge); }
.kpi span { font-size: .82rem; color: var(--texte-doux); font-weight: 600; }
.kpi strong { font-size: 1.7rem; color: var(--bleu); }
.kpi--rouge strong { color: var(--rouge); }
.kpi small { color: var(--texte-doux); font-size: .78rem; }

.dash__grille { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 16px; }
.carte { background: var(--blanc); border-radius: var(--radius); box-shadow: var(--ombre); padding: 20px; }
.carte h2 { margin: 0 0 14px; font-size: 1.05rem; color: var(--texte); }
.vide { color: var(--texte-doux); font-size: .9rem; margin: 0; }

.dash__studios { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 10px; }
.studio-tuile { border-radius: var(--radius-sm); padding: 12px 8px; text-align: center; display: flex; flex-direction: column; gap: 2px; }
.studio-tuile strong { font-size: 1rem; }
.studio-tuile span { font-size: .72rem; font-weight: 600; }
.studio-tuile--disponible   { background: #e3f6ec; color: var(--succes); }
.studio-tuile--occupe       { background: var(--rouge-clair); color: var(--rouge); }
.studio-tuile--nettoyage    { background: #fff4dc; color: var(--alerte); }
.studio-tuile--maintenance,
.studio-tuile--hors_service { background: #eceff4; color: var(--texte-doux); }

.dash__liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.dash__liste li { display: flex; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--bordure); }
.dash__liste li:last-child { border-bottom: none; }
.dash__liste li div { display: flex; flex-direction: column; gap: 2px; }
.dash__liste li span { font-size: .8rem; color: var(--texte-doux); }
.dash__liste-droite { align-items: flex-end; }
.dash__liste-droite small { color: var(--rouge); font-size: .75rem; font-weight: 600; }

@media (max-width: 1100px) { .dash__grille { grid-template-columns: 1fr; } }
```

#### `src/pages/public/Home/Home.jsx`
```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase.js';
import { FORMULES, formatFCFA } from '../../../lib/format.js';
import './Home.css';

// Site public : recherche de disponibilité (étape suivante : tunnel /reserver)
export default function Home() {
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [formule, setFormule] = useState('nuitee');
  const [resultats, setResultats] = useState(null);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  const rechercher = async (e) => {
    e.preventDefault();
    setErreur('');
    if (!debut || !fin || new Date(fin) <= new Date(debut)) return setErreur('Choisissez des dates valides.');
    setChargement(true);
    const p = { p_debut: new Date(debut).toISOString(), p_fin: new Date(fin).toISOString() };
    const { data, error } = await supabase.rpc('studios_disponibles', p);
    if (error) { setErreur('Recherche impossible pour le moment.'); setChargement(false); return; }

    // Prix de chaque studio pour la formule choisie
    const avecPrix = await Promise.all((data ?? []).map(async (s) => {
      const { data: prix } = await supabase.rpc('calculer_prix', { p_studio: s.id, p_formule: formule, ...p });
      return { ...s, prix };
    }));
    setResultats(avecPrix);
    setChargement(false);
  };

  return (
    <div className="home">
      <header className="home__nav">
        <img src="/logo-zaquia.png" alt="Zaquia Résidence" />
        <nav>
          <a href="#studios">Nos studios</a>
          <Link to="/suivi">Suivre ma réservation</Link>
        </nav>
      </header>

      <section className="home__hero">
        <div className="home__hero-texte">
          <h1>Studios meublés à Ziguinchor,<br /><em>à l’heure, à la journée ou à la nuit.</em></h1>
          <p>Réservez en ligne en 2 minutes. Confirmation rapide par WhatsApp.</p>
        </div>

        <form className="home__recherche" onSubmit={rechercher}>
          <div className="champ">
            <label>Formule</label>
            <select value={formule} onChange={(e) => setFormule(e.target.value)}>
              {Object.entries(FORMULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="champ">
            <label>Arrivée</label>
            <input type="datetime-local" value={debut} onChange={(e) => setDebut(e.target.value)} />
          </div>
          <div className="champ">
            <label>Départ</label>
            <input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} />
          </div>
          <button className="btn btn-rouge" disabled={chargement}>{chargement ? 'Recherche…' : 'Voir les disponibilités'}</button>
          {erreur && <p className="home__erreur">{erreur}</p>}
        </form>
      </section>

      <section id="studios" className="home__resultats">
        {resultats && (
          <>
            <h2>{resultats.length} studio(s) disponible(s)</h2>
            <div className="home__cartes">
              {resultats.map((s) => (
                <article key={s.id} className="home__carte">
                  <div className="home__photo" style={s.photos?.[0] ? { backgroundImage: `url(${s.photos[0]})` } : undefined} />
                  <div className="home__carte-corps">
                    <h3>{s.nom}</h3>
                    <p>{s.capacite} pers. · {s.equipements.slice(0, 3).join(' · ')}</p>
                    <div className="home__carte-pied">
                      <strong>{s.prix != null ? formatFCFA(s.prix) : '—'}</strong>
                      <Link className="btn btn-primaire"
                        to={`/reserver?studio=${s.id}&formule=${formule}&debut=${encodeURIComponent(debut)}&fin=${encodeURIComponent(fin)}`}>
                        Réserver
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <footer className="home__pied">
        © {new Date().getFullYear()} Zaquia Résidence · <Link to="/admin">Administration</Link>
      </footer>
    </div>
  );
}
```

#### `src/pages/public/Home/Home.css`
```css
.home { min-height: 100vh; display: flex; flex-direction: column; background: var(--blanc); }

.home__nav { display: flex; align-items: center; justify-content: space-between; padding: 14px 6vw; border-bottom: 1px solid var(--bordure); }
.home__nav img { height: 56px; }
.home__nav nav { display: flex; gap: 24px; }
.home__nav a { text-decoration: none; font-weight: 600; font-size: .92rem; }

.home__hero {
  background: linear-gradient(150deg, var(--bleu), var(--bleu-fonce));
  color: var(--blanc); padding: 64px 6vw 80px;
  display: flex; flex-direction: column; gap: 36px;
}
.home__hero h1 { font-family: var(--police-titre); font-size: clamp(2rem, 4.5vw, 3.2rem); line-height: 1.15; margin: 0 0 12px; }
.home__hero h1 em { font-style: normal; color: #ffb3bf; }
.home__hero p { margin: 0; opacity: .85; font-size: 1.05rem; }

.home__recherche {
  background: var(--blanc); color: var(--texte); border-radius: var(--radius);
  box-shadow: 0 14px 40px rgba(0,0,0,.25); padding: 20px;
  display: grid; grid-template-columns: 1fr 1.2fr 1.2fr auto; gap: 14px; align-items: end;
}
.home__recherche .btn { height: 48px; }
.home__erreur { grid-column: 1 / -1; color: var(--rouge); margin: 0; font-size: .9rem; }

.home__resultats { padding: 40px 6vw; flex: 1; }
.home__resultats h2 { color: var(--bleu); margin-top: 0; }
.home__cartes { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 20px; }
.home__carte { border-radius: var(--radius); overflow: hidden; box-shadow: var(--ombre); border: 1px solid var(--bordure); }
.home__photo { height: 170px; background: var(--bleu-clair) center / cover; }
.home__carte-corps { padding: 16px; }
.home__carte h3 { margin: 0 0 6px; }
.home__carte p { margin: 0 0 14px; color: var(--texte-doux); font-size: .88rem; }
.home__carte-pied { display: flex; align-items: center; justify-content: space-between; }
.home__carte-pied strong { color: var(--rouge); font-size: 1.1rem; }
.home__carte-pied .btn { padding: 9px 16px; text-decoration: none; }

.home__pied { text-align: center; padding: 22px; color: var(--texte-doux); font-size: .85rem; border-top: 1px solid var(--bordure); }

@media (max-width: 860px) {
  .home__recherche { grid-template-columns: 1fr; }
  .home__nav nav { display: none; }
}
```

---

## 9. Feuille de route

### PHASE 0 — Mise en place (toi + moi)

**Étape 0.1 · Création du projet** *(toi)*
Crée tous les fichiers du § 8 + `supabase/schema.sql` (§ 7) + `README.md`, les dossiers vides `public/` et `supabase/migrations/`.
Lance `npm install`. Puis demande-moi de déposer le logo `logo-zaquia.png` dans `public/` (explique où se trouve le dossier). Attends.

**Étape 0.2 · Créer le projet Supabase** *(moi, guidé par toi)*
Guide-moi : aller sur supabase.com → *New project* → nom `zaquia-residence`, mot de passe de base (à noter),
région la plus proche (Europe, ex. Paris/Frankfurt) → attendre la fin de création. Attends ma confirmation.

**Étape 0.3 · Exécuter le schéma** *(moi, guidé par toi)*
Guide-moi : *SQL Editor* → *New query* → ouvrir `supabase/schema.sql` dans VS Code, tout copier (Ctrl+A, Ctrl+C) → coller → *Run*.
Dis-moi quoi vérifier (*Table Editor* : tables `studios`, `reservations`, etc. présentes). Si erreur : je te colle le message, tu corriges.

**Étape 0.4 · Configurer l'authentification** *(moi, guidé par toi)*
*Authentication → Sign In / Providers → Email* : laisser activé ; désactiver « Allow new users to sign up »
(seul l'admin crée les comptes). *Authentication → URL Configuration* : Site URL `http://localhost:5173`,
Redirect URL `http://localhost:5173/admin/login`.

**Étape 0.5 · Mon compte administrateur** *(moi, guidé par toi)*
*Authentication → Users → Add user → Create new user* : mon email + mot de passe, cocher *Auto Confirm User*.
Puis dans *SQL Editor*, exécuter (tu me prépares la requête avec mon email) :
```sql
update profiles set role = 'admin', actif = true, full_name = 'Ousmane'
where id = (select id from auth.users where email = 'MON_EMAIL');
```

**Étape 0.6 · Les clés dans `.env`** *(moi + toi)*
Guide-moi : *Project Settings → API* (ou *Data API / API Keys*) → copier **Project URL** et la clé **anon public**.
Je te les donne, tu crées le fichier `.env` (jamais la clé `service_role`).

**Étape 0.7 · Premier test** *(toi + moi)*
Lance `npm run dev`. Demande-moi d'ouvrir `http://localhost:5173/admin` : je dois voir l'écran de chargement,
la barre rouge qui remplit la bleue, puis la connexion. Je me connecte → tableau de bord. Teste aussi `http://localhost:5173/`.

**Étape 0.8 · Git (optionnel)** — `git init`, premier commit, et si je veux, guide-moi pour créer le dépôt GitHub.

### PHASE 1 — Catalogue
**Étape 1 · Studios & tarifs** — `/admin/studios` (admin, gérant) : `services/studios.js` ; cartes studios (code, nom, catégorie,
statut coloré, publié) ; modale ajout/modif (infos, équipements en cases à cocher, capacité, étage, surface) ; upload multiple
de photos dans le bucket Storage `studios` (migration bucket + policies, et guide-moi pour l'exécuter) ; onglet Tarifs
(un prix par formule, activer/désactiver) ; « Dupliquer la grille tarifaire » ; changement rapide de statut.
Ensuite, aide-moi à saisir mes vrais studios et prix (le studio S101 est un exemple à modifier ou supprimer).

**Étape 2 · Personnel & rôles** — `/admin/personnel` (admin) : liste, activer/désactiver, rôle, nom, téléphone.
Création d'employé via Edge Function `creer-employe` (service_role côté serveur uniquement). Guide-moi pour installer
la Supabase CLI et déployer la fonction.

### PHASE 2 — Cœur métier
**Étape 3 · Clients** — recherche nom/téléphone, fiche, pièce d'identité, notes, liste noire, historique, total dépensé.

**Étape 4 · Réservations** — tableau filtrable (statut, période, studio, source), recherche référence/téléphone ;
« Nouvelle réservation » en 3 étapes ; raccourcis de dates selon la formule (nuitée 18h → 12h lendemain, lus dans `parametres`) ;
gestion erreur `23P01` ; remise et caution.

**Étape 5 · Fiche réservation** — `/admin/reservations/:id` : Confirmer, Check-in, Prolonger, Changer de studio,
Check-out (alerte si reste à payer), Annuler/No-show (motif) ; journal ; bouton WhatsApp.

**Étape 6 · Planning** — grille Gantt CSS, vues Jour/Semaine/Mois, navigation, clics, Supabase Realtime.

### PHASE 3 — Argent
**Étape 7 · Caisse** — paiements, journal du jour par mode, clôture journalière (table `clotures_caisse`), reçu PDF avec logo (`jspdf`).
**Étape 8 · Dépenses** — saisie, catégories, filtre mois, total, rattachement studio.
**Étape 9 · Rapports** — CA, occupation, bénéfice, top clients, sources ; vues SQL ; `recharts` ; export CSV.

### PHASE 4 — Opérations
**Étape 10 · Ménage** — vue mobile, Commencer/Terminé, assignation, temps réel.
**Étape 11 · Maintenance & inventaire** — pannes (photo, priorité, coût), studio en maintenance si urgent, inventaire par studio.
**Étape 12 · Paramètres** — table `parametres`, catégories de studios et de dépenses.

### PHASE 5 — Site public
**Étape 13 · Pages studios** — `/studios` (galerie, prix « à partir de »), `/studios/:id` (carrousel CSS, équipements, prix, calendrier dispo).
**Étape 14 · Tunnel de réservation** — `/reserver`, `/confirmation/:ref`, `/suivi`.
**Étape 15 · Notifications** — alerte + son dans l'admin à chaque réservation « site » (Realtime) ; Edge Function `notifier`
(email de confirmation quand `confirmee`) ; emplacement prévu pour WhatsApp Business API.
**Étape 16 · Paiement en ligne PayDunya (option)** — Edge Functions `paydunya-checkout` et `paydunya-webhook` (IPN) ;
paiement enregistré (mode `paydunya`) + réservation `confirmee` ; clés dans les secrets Supabase.

### PHASE 6 — Finitions
**Étape 17 · Qualité** — états partout, responsive, accessibilité, confirmations, expiration auto des `en_attente`
non confirmées après X heures (pg_cron), audit des policies RLS par rôle.
**Étape 18 · Déploiement** — Vercel ou Netlify (rewrites React Router), variables d'environnement, domaine,
mise à jour des URL Auth Supabase, backups, SMTP personnalisé.

---

## 10. Suivi (Claude Code coche au fur et à mesure)

- [x] 0.1 Création du projet
- [x] 0.2 Projet Supabase
- [x] 0.3 Schéma exécuté
- [x] 0.4 Authentification configurée
- [x] 0.5 Compte admin
- [x] 0.6 Fichier .env
- [x] 0.7 Premier test OK
- [x] 0.8 Git
- [x] 1 Studios & tarifs
- [x] 2 Personnel & rôles
- [x] 3 Clients
- [x] 4 Réservations
- [x] 5 Fiche réservation
- [x] 6 Planning
- [x] 7 Caisse
- [x] 8 Dépenses
- [x] 9 Rapports
- [x] 10 Ménage
- [x] 11 Maintenance & inventaire
- [x] 12 Paramètres
- [x] 13 Pages studios
- [x] 14 Tunnel de réservation
- [x] 15 Notifications (alertes admin ✓ — email client reporté à l'étape 18)
- [ ] 16 PayDunya — ⏸ en attente de l'accord du propriétaire (compte marchand à son nom, RCCM)
- [x] 17 Qualité
- [x] 18 Déploiement — en ligne sur https://residence-zackya.vercel.app (nom de domaine à venir)

### Notes de progression
*(Claude Code : note ici les décisions importantes, problèmes rencontrés, et où on s'est arrêté.)*

- **2026-10-28 · Étape 0.1** : fichiers du § 8 extraits automatiquement de CLAUDE.md (copies exactes), `schema.sql` = § 7.
  `npm install` OK (Node 20.19), `npm run build` OK. Logo déposé (PNG 869×869).
  4 alertes `npm audit` (outils de dev Vite 5/esbuild) volontairement non corrigées : `--force` changerait la version majeure de Vite.
  Git : dépôt propre au projet créé à l'étape 0.8 (ne jamais committer depuis `/Users/apple`).
- **2026-10-28 · Étape 0.2** : projet Supabase créé — URL `https://lyqxnkfgqbrkhdyhpcbd.supabase.co` (ref `lyqxnkfgqbrkhdyhpcbd`).
- **2026-10-28 · Étape 0.3** : `schema.sql` exécuté dans le SQL Editor (12 tables, S101 + 6 tarifs vérifiés par Ousmane).
- **2026-10-28 · Étape 0.4** : inscriptions désactivées, Site URL `http://localhost:5173`, Redirect `http://localhost:5173/admin/login` (à changer au déploiement).
- **2026-10-28 · Étape 0.5** : compte admin `zackya@admin.com` (Ousmane, role admin, actif). ⚠️ Domaine non réel → « Mot de passe oublié » inutilisable pour ce compte.
- **2026-10-28 · Étape 0.6** : `.env` créé (clé anon legacy, ignoré par git). Testé via REST : studios/tarifs/paramètres lisibles, reservations/clients = [] en anon (RLS OK), `studios_disponibles` OK, `calculer_prix` S101 nuitée 2 nuits = 50 000.
- **2026-10-28 · Étape 0.7** : test validé par Ousmane (splash → login → dashboard, recherche publique S101 25 000 FCFA).
  📍 **La résidence est à ZIGUINCHOR, pas à Dakar.** Corrigé : Home.jsx, README, CLAUDE.md § 1/§ 8. Migration `001_adresse_ziguinchor.sql`
  (paramètre `adresse`). `schema.sql`/§ 7 laissés tels qu'exécutés (contiennent encore 'Dakar' → la migration 001 corrige). Fuseau `Africa/Dakar` conservé (fuseau de tout le Sénégal).
- **2026-10-28 · Étape 0.8** : `git init` dans le projet, branche `main`, remote `https://github.com/NDIAYE-dotcom/residence-zackya.git`. **Phase 0 terminée.**
- **2026-10-28 · Migration 001** exécutée et vérifiée (`adresse` = « Ziguinchor, Sénégal »). Prochaine étape : **1 · Studios & tarifs**.
- **2026-10-28 · Étape 1 Studios & tarifs** : testée et validée par Ousmane. Migration `002_storage_photos_studios.sql` exécutée (bucket public `studios`, 5 Mo, JPG/PNG/WEBP, écriture admin/gérant).
  Ajouts réutilisables : `components/Modal` (portal + pile Échap), `components/Confirm` (slot children pour un motif), `components/Toast` (`useToast().succes/erreur`),
  `lib/erreurs.js` (`messageErreur(err)` : 23P01, 23505, 23503, RLS, Storage…), `lib/images.js` (compression JPEG 1600 px), `services/journal.js` (`journaliser(action, table, id, details)`),
  `format.js` : `DUREES_FORMULE`, `UNITES_FORMULE`. Photos = URLs publiques dans `studios.photos` (1re = couverture, 12 max).
  Suppression d'un studio avec réservations → 23503 → message « dépubliez-le ou Hors service ».
  ⏳ Reste : saisir les vrais studios et prix d'Ousmane (S101 = exemple à modifier/supprimer).
- **2026-10-28 · Site public (en avance sur l'étape 13)** : à la demande d'Ousmane, toutes les photos sont visibles sur les cartes de l'accueil.
  Nouveaux composants réutilisables : `components/Carrousel` (scroll-snap, flèches, points, compteur) et `components/Galerie` (plein écran, ← → Échap, glisser, miniatures) → à réutiliser pour `/studios/:id`.
  Menu ☰ mobile ajouté à l'entête de l'accueil (les liens étaient masqués sous 860 px).
- **2026-10-28 · Étape 2 Personnel & rôles** : testée et validée. Migration `003_personnel.sql` exécutée (`profiles.email` + trigger `proteger_dernier_admin`).
  Edge Function `creer-employe` (actions `creer` / `changer_mot_de_passe`, admin actif vérifié dans le code) déployée **via l'éditeur du Dashboard**
  (la CLI de ce Mac est connectée à un AUTRE compte Supabase → ne pas l'utiliser pour ce projet sans `supabase login` dédié). « Verify JWT with legacy secret » = **OFF**.
  Pour redéployer : Edge Functions > creer-employe > Code > coller `supabase/functions/creer-employe/index.js` > Deploy.
  Comptes créés confirmés d'office (pas d'email envoyé) ; l'admin transmet les accès (Copier / WhatsApp). Utilitaires : `lib/telephone.js`, `lib/motDePasse.js`, `ROLES_STAFF` dans format.js.
  Compte de test « Awa Test » (awa@test.sn) créé pendant les tests → à désactiver ou supprimer (Supabase > Authentication > Users).
- **2026-10-28 · Étape 3 Clients** : testée et validée. Migration `004_clients.sql` exécutée (`liste_noire_motif`, `liste_noire_le`, vue `v_clients` avec nb_reservations / nb_sejours / dernier_sejour / total_depense).
  Téléphones clients **normalisés** `+221XXXXXXXXX` (ou international `+33…`) via `normaliserTelephoneClient()` — à utiliser PARTOUT (résa admin, site public avant `creer_reservation_publique`, `suivre_reservation`), sinon doublons.
  Fiche `/admin/clients/:id` ; historique sans lien pour l'instant → **ajouter le lien vers `/admin/reservations/:id` à l'étape 5**. `lienWhatsApp(tel, message)` dans lib/telephone.js pour l'étape 5.
- **2026-10-29 · Étape 4 Réservations** : testée et validée (ZQ-261029-0001 créée, double réservation bloquée, dashboard OK). Migration `005_reservations.sql` exécutée.
  RPC `studios_libres_staff(formule, debut, fin, p_exclure)` (security invoker, inclut les non publiés) → **réutiliser `p_exclure` pour Prolonger / Changer de studio à l'étape 5**.
  RPC `creer_reservation_staff(...)` : prix recalculé en base, résa + acompte + journal en une transaction, renvoie `res_id, res_reference, res_montant`.
  `lib/dates.js` : `debutParDefaut`, `calculerFin` (horaires lus dans `parametres` via `services/parametres.js`, mis en cache → `viderCacheParametres()` à l'étape 12).
  La liste n'a pas encore de lien vers la fiche → **étape 5 : rendre les lignes cliquables vers `/admin/reservations/:id`** (+ historique de la fiche client).
- **2026-10-29 · Brouillons de formulaires** (demande d'Ousmane : la saisie disparaissait en quittant / actualisant la page) :
  hook `src/hooks/useBrouillon.js` (= useState persistant en localStorage, clé par employé, 24 h, rien de stocké tant que la valeur = valeur de départ)
  → `[valeur, setValeur, { restaure, marquerEnregistre, abandonner }]` + bandeau `components/BrouillonRestaure`. Effacés à la déconnexion (`effacerTousLesBrouillons` dans signOut).
  Appliqué à : Nouvelle réservation (étape incluse), ClientModal, StudioModal (infos), StudioTarifs, EmployeModal (**jamais le mot de passe**).
  Règle : « Annuler » = abandonne le brouillon ; ×, Échap, changement de page, actualisation = brouillon conservé. **À utiliser pour tous les futurs formulaires.**
- **2026-10-30 · Étape 5 Fiche réservation** : testée et validée (prolonger, check-in, encaisser, check-out avec alerte, annulation). Migration `006_cycle_reservation.sql` exécutée.
  RPC : `changer_statut_reservation(id, statut, motif)` (transitions + pièce obligatoire au check-in + motif obligatoire, journal), `prolonger_reservation(id, fin)`,
  `changer_studio_reservation(id, studio)` (security definer, ancien studio → nettoyage + tâche si en_cours), `journal_reservation(id)` (historique lisible par admin/gérant/réception/comptable).
  Colonnes ajoutées : `reservations.motif_annulation / annulee_le / annulee_par` ; **`v_reservations` recréée** (r.* figé à la création → la recréer si on ajoute encore des colonnes à reservations).
  Bouton « Encaisser » sur la fiche (`PaiementModal` + `services/paiements.js`) en avance sur l'étape 7 → la Caisse réutilisera `enregistrerPaiement`. Journal des paiements rattaché à la réservation (`paiement.ajoute`).
  Restitution de caution non gérée (type `remboursement` réduirait total_paye) → **à traiter à l'étape 7**.
- **2026-10-30 · Étape 6 Planning** : testé et validé (vues Jour/Semaine/Mois, clic barre → fiche, clic case vide → nouvelle résa pré-remplie, temps réel entre 2 fenêtres).
  Migration `007_realtime_planning.sql` exécutée (publication `supabase_realtime` : reservations + studios ; RLS appliquée → le ménage ne voit pas les noms clients).
  `services/planning.js` : `abonnerPlanning(rappel, surStatut)` (canal postgres_changes, état SUBSCRIBED/CHANNEL_ERROR affiché) → **réutiliser pour Ménage (étape 10) et notifications (étape 15)**.
  Vue + date dans l'URL (`?vue=semaine&date=AAAA-MM-JJ`). Nouvelle réservation accepte `?studio=&formule=&debut=` (abandonne le brouillon, va à l'étape 2, studio présélectionné si libre).
  Barres : terminée = jusqu'au `checkout_at` réel ; annulées / no-show non affichées.
- **2026-10-30 · Étape 7 Caisse** : testée et validée. Migration `008_caisse.sql` exécutée :
  vraies coordonnées (`adresse` = « Ziguinchor, Goumel », `telephone` = +221 77 656 28 04, `whatsapp` = 221776562804) ; type `restitution_caution` ;
  `paiements.numero_recu` (séquence `recu_seq`) ; table `clotures_caisse` (+ `cloturer_caisse(jour, comptees, notes)`, réouverture = delete admin) ;
  trigger `verifier_caisse_ouverte` (aucun paiement sur un jour clôturé, sauf mode `paydunya` → **à garder en tête pour l'étape 16**).
  Règles d'argent dans `format.js` : `TYPES_ENTREE`, `TYPES_SORTIE`, `signeCA(type)` (CA = acompte + solde + extra − remboursement ; cautions hors CA) → **à réutiliser pour Rapports (étape 9)**.
  Reçu PDF au format du carnet papier d'Ousmane (A5 paysage) : `lib/recuDessin.js` (dessin pur, testable hors navigateur) + `lib/recu.js` (`imprimerRecu(paiementId)`, jsPDF chargé à la demande) + `lib/nombres.js` (montant en lettres).
  Ajout demandé : avertissement « arrivée dans le passé » (`jourPasse()` dans dates.js) à l'étape 1 et dans le récapitulatif de Nouvelle réservation.
  ⚠️ Build : avertissement « chunk > 500 kB » (pas une erreur) → **étape 17 : découper les routes avec React.lazy**.
- **2026-10-30 · Étape 8 Dépenses** : testée et validée. Migration `009_depenses.sql` exécutée (table `categories_depenses` nom/ordre/actif + 12 catégories, ajout possible depuis le formulaire ; update admin → **gestion complète à l'étape 12**).
  Page par mois (`?mois=AAAA-MM`), évolution vs mois précédent, répartition par catégorie, filtres, export CSV (`lib/csv.js` : `telechargerCSV(nom, colonnes, lignes)` → **réutiliser à l'étape 9**).
  `depenses.studio_id` facultatif → coût par studio disponible pour les Rapports.
- **2026-10-31 · Étape 9 Rapports** : testée et validée (bureau + téléphone). Migrations `010_rapports.sql` puis **`011_correctif_occupation.sql`** exécutées.
  `rapport_periode(du, au)` renvoie tout en un JSON (CA, cautions, dépenses, heures occupées/période, par studio/formule/source, top clients, dépenses par catégorie, série jour ≤ 62 j sinon mois).
  CA = comptabilité de **caisse** (date du paiement, cautions exclues) : une réservation annulée non remboursée garde son CA.
  🐞 Leçon : `LEAST`/`GREATEST` ignorent les NULL → après un LEFT JOIN, toujours `sum(...) filter (where r.id is not null)` (bug occupation 100 % corrigé en 011).
  `recharts` chargé à la demande (`React.lazy`, GraphiqueEvolution) ; couleurs graphiques `--graphe-1` (#1f4fa8, bleu éclairci) / `--graphe-2` (rouge) validées daltonisme (script dataviz) ; composant `BarresHorizontales`.
  `formatDate()` lit désormais « AAAA-MM-JJ » en heure locale (évitait un décalage d'un jour).
- **2026-10-31 · Étape 10 Ménage** : testée et validée (commencer/terminer, studio → disponible, tâche manuelle, assignation, temps réel, rôle ménage sur téléphone).
  Migration `012_menage.sql` exécutée : `taches_menage.commencee_le / terminee_par`, trigger `menage_termine` (disponible seulement si plus aucune tâche ouverte sur le studio),
  vue `v_taches_menage` (avec `prochaine_arrivee`), RPC `personnel_menage()` (les non-admins ne lisent pas `profiles`), publication realtime `taches_menage`.
  Le rôle `menage` est redirigé vers `/admin/menage` au login et après l'écran de chargement.
- **2026-10-31 · Étape 11 Maintenance & inventaire** : testée et validée. Migration `013_maintenance_inventaire.sql` exécutée :
  `maintenances.photos / resolu_par / notes_resolution / depense_id` ; trigger `maintenance_statut_studio` (urgente ouverte → studio `maintenance` si libre/nettoyage ; résolue → disponible s'il n'en reste pas) ;
  `menage_termine` → `maintenance` au lieu de `disponible` si panne urgente ouverte ; RPC `resoudre_maintenance(id, cout, notes, creer_depense)` (security definer, crée la dépense « Réparations / maintenance » rattachée au studio) ;
  vue `v_maintenances` (définisseur, filtrée `est_staff()`) ; bucket public `maintenance` ; table `inventaire` (unique studio+article, état bon/use/a_remplacer).
  ⚠️ `studio_disponible` / `studios_disponibles` (site public) excluent désormais aussi `maintenance` ; côté réception (`studios_libres_staff`) le studio reste proposé avec le badge « Actuellement : Maintenance ».
- **2026-10-31 · Étape 12 Paramètres** : testée et validée. Migration `014_parametres.sql` exécutée (suppression catégorie de dépense si inutilisée, RPC `renommer_categorie_depense` qui met à jour les dépenses, index journal).
  Onglets Résidence (paramètres → `viderCacheParametres()` après enregistrement ; `whatsapp` stocké au format wa.me `221XXXXXXXXX`), Catégories (studios + dépenses : renommer/masquer/ordre/supprimer), Journal (filtres module/employé/dates, liens vers fiches).
  ⚠️ `resoudre_maintenance` écrit la catégorie en dur « Réparations / maintenance » : si elle est renommée, les nouvelles dépenses de maintenance reprendront l'ancien nom (affiché quand même dans Dépenses).
  `EnConstruction.jsx` supprimé : **les 12 modules de l'administration sont faits**. Phase 4 terminée → **prochaine : Phase 5, site public (étape 13)**.
- **2026-10-31 · Étape 13 Pages studios** : validée. Migration `015_calendrier_public.sql` exécutée (`calendrier_studio(studio, du, au)` libre/partiel/complet, anon ; coordonnées : `telephone_fixe`, `email`, `rccm`).
  `layouts/PublicLayout` : barre flottante **verre dépoli** (`--verre`, `--verre-bord`), logo agrandi, pied de page coordonnées complètes + RCCM ; variable `--hauteur-entete` → le diaporama de l'accueil remonte sous la barre.
  Accueil : `HeroDefilant` (5 photos `public/hero/hero-N.jpg` + `-mobile.jpg`, fondu + zoom, pause, glisser, bouton « Voir la galerie »), recherche à cheval, bandeau d'atouts. Originaux déplacés dans `photos-originales/` (non publiés).
  `/studios` et `/studios/:id` (`services/public.js` : `catalogueStudios`, `studioPublic` avec `.eq('tarifs.actif', true)` car le personnel connecté voit aussi les tarifs inactifs).
  Vérification visuelle possible sans connexion : Playwright + Chrome système (scratchpad, `channel: 'chrome'`).
- **2026-10-31 · Étape 14 Tunnel de réservation** : testé et validé (réservation en ligne réelle, WhatsApp, suivi, confirmation admin visible côté client). Migration `016_reservation_publique.sql` exécutée :
  `creer_reservation_publique` renforcée (téléphone `+221…` obligatoire — le front normalise avec `normaliserTelephone`, capacité, ≤ 93 j, liste noire, max 3 `en_attente` site par client, journal user_id null) ;
  `suivre_reservation` (drop/recreate) renvoie aussi `studio_code, studio_id, remise, total_paye, nb_personnes`.
  Pages `/reserver` (vérif dispo + prix en direct, honeypot `site_web`, brouillon « public »), `/confirmation/:ref` (téléphone gardé en sessionStorage `zaquia:suivi:REF`), `/suivi`.
  Le visiteur n'a pas le temps réel (RLS) → `hooks/useActualisationAuto.js` (toutes les 15 s + retour sur l'onglet) sur Suivi et Confirmation.
- **2026-10-31 · Étape 15 Notifications (en cours)** : alertes admin en temps réel (`hooks/useAlertesReservations.js` + `components/AlertesReservations` + cloche/pastille dans AdminLayout, carillon `lib/son.js`, notification navigateur si onglet caché).
  Edge Function `supabase/functions/notifier/index.js` écrite (email de confirmation via Resend + emplacement WhatsApp Business API), appelée par « Confirmer » dans la fiche (échec silencieux si non déployée).
  ⏳ **Décision d'Ousmane : Resend attendra l'achat du nom de domaine.** `notifier` N'EST PAS déployée. **À faire à l'étape 18** : compte Resend + vérification du domaine (DNS) → secrets `RESEND_API_KEY`, `EMAIL_EXPEDITEUR`, `SITE_URL` → déployer `notifier` (Verify JWT OFF).
- **2026-10-31 · Étape 15 validée** (alertes temps réel, son, pastille, notification navigateur testés par Ousmane). Email client : voir note ci-dessus (étape 18).
- **2026-10-31 · Suivi par référence seule** (demande d'Ousmane) : migration `017_statut_par_reference.sql` → RPC `statut_reservation_public(reference)` (anon) qui ne renvoie **aucune donnée personnelle** (statut, studio, formule, dates).
  Les montants restent derrière `suivre_reservation` (référence + téléphone, téléphone mémorisé en sessionStorage sur l'appareil qui a réservé).
  `/suivi` : un seul champ, recherche automatique dès qu'une référence complète est saisie (`lib/reference.js` `normaliserReference`), actualisation auto 15 s ; encadré « Déjà réservé ? » sur l'accueil.
- **2026-10-31 · Suivi par référence testé** (migration 017 exécutée).
- **2026-10-31 · Étape 16 PayDunya REPORTÉE** : Ousmane doit d'abord obtenir l'accord du propriétaire (compte marchand PayDunya au nom de la résidence + RCCM).
  Déjà prêt : mode `paydunya` dans `mode_paiement`, trigger caisse qui laisse passer `paydunya` un jour clôturé. Prévoir : Edge Functions `paydunya-checkout` + `paydunya-webhook` (IPN), secrets PayDunya, bouton « Payer l'acompte » sur /confirmation et /suivi.
  → On passe à l'étape 17 (Qualité) sur « continue ».
- **2026-10-31 · Étape 17 Qualité** : validée (parcours quotidien testé par Ousmane après la migration 018). Migration `018_securite_expiration.sql` exécutée (inclut 017, qui n'avait pas été appliquée).
  Audit anonyme (curl, clé anon) : 15 tables/vues privées → 0 ligne ; écritures refusées ; 12 RPC du personnel → 42501 ; listing Storage vide.
  Renforcement : `creer_reservation_staff`, `changer_statut_reservation`, `prolonger_reservation` passées en **security definer** ; insert/update directs sur `reservations` = **admin seul** ;
  policy « ménage: statut studio » supprimée ; delete ménage/maintenance = admin+gérant ; journal `user_id = auth.uid()` ; paiements `recu_par = auth.uid()`.
  `expirer_reservations_en_attente()` (site, en_attente, sans paiement, après `parametres.expiration_attente_heures` = 24) planifiée par **pg_cron** toutes les 15 min (job `zaquia-expiration-attente`).
  Front : `React.lazy` sur toutes les pages sauf Home (bundle initial 425 Ko), `components/Chargement`, page `Introuvable` (404 public), `/admin/*` inconnu → dashboard, titres d'onglet admin, lien d'évitement + `:focus-visible`, `services/dashboard.js` (plus aucun `supabase.from` dans les pages).
- **2026-10-31 · Étape 18 Déploiement** : ✅ en ligne sur **https://residence-zackya.vercel.app** (Vercel, projet `residence-zackya`, déploiement automatique à chaque push sur `main`).
  `vercel.json` : réécriture SPA vers index.html, cache 1 an `/assets`, 30 j `/hero`, en-têtes nosniff / DENY / referrer. Variables Vercel : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (clé anon seulement).
  Supabase Auth : Site URL = https://residence-zackya.vercel.app ; Redirect URLs = localhost:5173/admin/login + https://residence-zackya.vercel.app/admin/login.
  Sauvegardes : offre gratuite = pas de sauvegarde automatique → **Paramètres > Sauvegarde** (export JSON 15 tables, `parametres.derniere_sauvegarde`) + rappel sur le tableau de bord admin après 30 j. Projet gratuit mis en pause après 7 j sans activité.
  Testé en ligne par Ousmane (4G : site, réservation, suivi, admin, cloche, sauvegarde).

### ⏳ RESTE À FAIRE (plus tard)
1. **Nom de domaine** (ex. zaquia-residence.sn) : Vercel > Settings > Domains ; puis mettre à jour Site URL / Redirect URLs Supabase.
2. **Resend** (après le domaine) : compte + vérification DNS du domaine → secrets `RESEND_API_KEY`, `EMAIL_EXPEDITEUR`, `SITE_URL` → déployer l'Edge Function `notifier` (Verify JWT OFF). Utiliser aussi Resend comme **SMTP personnalisé** de Supabase Auth (emails « Mot de passe oublié » sans la limite de l'expéditeur par défaut).
3. **PayDunya** (étape 16) : après accord du propriétaire (compte marchand + RCCM).
4. Facultatif : offre **Supabase Pro** pour des sauvegardes automatiques quotidiennes.
5. Données réelles : saisir les vrais studios / prix / photos, créer les comptes du personnel, supprimer les données de test (réservations ZQ-2610xx, clients Fatou Sané / Jean Dupont / DEMBA, compte Awa Test).
