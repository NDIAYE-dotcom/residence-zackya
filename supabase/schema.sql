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
