-- =====================================================================
--  009 — Dépenses : catégories + index
--  À exécuter dans : Supabase > SQL Editor > New query
--  (les catégories seront modifiables dans Paramètres à l'étape 12)
-- =====================================================================

create table if not exists categories_depenses (
  nom    text primary key,
  ordre  int not null default 100,
  actif  boolean not null default true
);

insert into categories_depenses (nom, ordre) values
  ('Électricité (Senelec)',          10),
  ('Eau',                            20),
  ('Internet / téléphone',           30),
  ('Salaires',                       40),
  ('Produits d''entretien',          50),
  ('Linge / blanchisserie',          60),
  ('Réparations / maintenance',      70),
  ('Équipement / mobilier',          80),
  ('Carburant / groupe électrogène', 90),
  ('Loyer / charges',               100),
  ('Taxes / impôts',                110),
  ('Autre',                         999)
on conflict (nom) do nothing;

alter table categories_depenses enable row level security;
drop policy if exists "catégories dépenses: lecture" on categories_depenses;
drop policy if exists "catégories dépenses: ajout"   on categories_depenses;
drop policy if exists "catégories dépenses: gestion admin" on categories_depenses;
create policy "catégories dépenses: lecture" on categories_depenses for select
  using (est_staff(array['admin','gerant','comptable']::role_staff[]));
-- Une nouvelle catégorie peut être ajoutée depuis le formulaire de dépense
create policy "catégories dépenses: ajout" on categories_depenses for insert
  with check (est_staff(array['admin','gerant','comptable']::role_staff[]));
create policy "catégories dépenses: gestion admin" on categories_depenses for update
  using (est_staff(array['admin']::role_staff[]));

create index if not exists depenses_date_idx on depenses (date_depense);
create index if not exists depenses_studio_idx on depenses (studio_id);

-- Vérification : doit lister les 12 catégories
select nom from categories_depenses order by ordre;
