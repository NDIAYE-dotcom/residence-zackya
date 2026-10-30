-- =====================================================================
--  013 — Maintenance (pannes, photos, coût → dépense) et inventaire par studio
--  À exécuter dans : Supabase > SQL Editor > New query
-- =====================================================================

-- ---------- 1) Pannes : photos, résolution, lien avec la dépense ----------
alter table maintenances add column if not exists photos text[] not null default '{}';
alter table maintenances add column if not exists resolu_par uuid references profiles(id);
alter table maintenances add column if not exists notes_resolution text;
alter table maintenances add column if not exists depense_id uuid references depenses(id) on delete set null;
create index if not exists maintenances_statut_idx on maintenances (statut);
create index if not exists maintenances_studio_idx on maintenances (studio_id);

-- Panne URGENTE ouverte → studio « Maintenance » (s'il est libre ou en nettoyage).
-- Panne résolue → studio « Disponible » s'il ne reste aucune autre panne urgente ouverte.
create or replace function maintenance_statut_studio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.priorite = 'urgente' and new.statut <> 'terminee' then
    update studios set statut = 'maintenance' where id = new.studio_id and statut in ('disponible','nettoyage');
  end if;
  if tg_op = 'UPDATE' and new.statut = 'terminee' and old.statut <> 'terminee' then
    new.resolu_le  := coalesce(new.resolu_le, now());
    new.resolu_par := coalesce(new.resolu_par, auth.uid());
    if not exists (select 1 from maintenances m
                   where m.studio_id = new.studio_id and m.id <> new.id
                     and m.priorite = 'urgente' and m.statut <> 'terminee') then
      update studios set statut = 'disponible' where id = new.studio_id and statut = 'maintenance';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_maintenance_studio on maintenances;
create trigger trg_maintenance_studio before insert or update on maintenances
  for each row execute function maintenance_statut_studio();

-- Ménage terminé : le studio va en « Maintenance » (et non « Disponible ») si une panne urgente est ouverte
create or replace function menage_termine() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.statut = 'en_cours' and old.statut = 'a_faire' then
    new.commencee_le := coalesce(new.commencee_le, now());
  end if;
  if new.statut = 'terminee' and old.statut <> 'terminee' then
    new.terminee_le := now();
    new.terminee_par := coalesce(new.terminee_par, auth.uid());
    new.commencee_le := coalesce(new.commencee_le, now());
    update studios set statut = case
        when exists (select 1 from maintenances m where m.studio_id = new.studio_id
                     and m.priorite = 'urgente' and m.statut <> 'terminee') then 'maintenance'::statut_studio
        else 'disponible'::statut_studio end
    where id = new.studio_id and statut = 'nettoyage'
      and not exists (select 1 from taches_menage t
                      where t.studio_id = new.studio_id and t.id <> new.id and t.statut <> 'terminee');
  end if;
  return new;
end $$;

-- Résoudre une panne : coût + création facultative de la dépense (rattachée au studio)
-- security definer : la réception / le ménage peuvent clôturer une panne et noter son coût.
create or replace function resoudre_maintenance(p_id uuid, p_cout int, p_notes text default null, p_creer_depense boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare m maintenances%rowtype; v_code text; v_depense uuid;
begin
  if not est_staff() then raise exception 'Accès réservé au personnel.'; end if;
  select * into m from maintenances where id = p_id for update;
  if not found then raise exception 'Panne introuvable.'; end if;
  if m.statut = 'terminee' then raise exception 'Cette panne est déjà résolue.'; end if;
  if coalesce(p_cout, 0) < 0 then raise exception 'Coût invalide.'; end if;

  if p_creer_depense and coalesce(p_cout, 0) > 0 then
    select code into v_code from studios where id = m.studio_id;
    insert into depenses (categorie, libelle, montant, date_depense, studio_id, saisi_par)
    values ('Réparations / maintenance', 'Maintenance ' || v_code || ' : ' || m.titre, p_cout,
            (now() at time zone 'Africa/Dakar')::date, m.studio_id, auth.uid())
    returning id into v_depense;
  end if;

  update maintenances
  set statut = 'terminee', cout = coalesce(p_cout, 0), notes_resolution = nullif(trim(p_notes), ''), depense_id = v_depense
  where id = p_id;

  insert into journal_activite (user_id, action, cible_table, cible_id, details)
  values (auth.uid(), 'maintenance.resolue', 'maintenances', p_id,
          jsonb_build_object('titre', m.titre, 'cout', coalesce(p_cout, 0), 'depense', v_depense is not null));
end $$;

revoke execute on function resoudre_maintenance(uuid, int, text, boolean) from public, anon;
grant  execute on function resoudre_maintenance(uuid, int, text, boolean) to authenticated;

-- Vue des pannes avec noms (les non-admins ne lisent pas « profiles » directement).
-- Vue « définisseur » : filtrée par est_staff() pour ne rien montrer hors personnel.
create or replace view v_maintenances as
select m.*, s.code as studio_code, s.nom as studio_nom, s.statut as studio_statut,
       ps.full_name as signale_par_nom, pr.full_name as resolu_par_nom
from maintenances m
join studios s on s.id = m.studio_id
left join profiles ps on ps.id = m.signale_par
left join profiles pr on pr.id = m.resolu_par
where est_staff();

-- ---------- 2) Site public : un studio en maintenance n'est plus réservable en ligne ----------
create or replace function studio_disponible(p_studio uuid, p_debut timestamptz, p_fin timestamptz)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from reservations
    where studio_id = p_studio
      and statut in ('en_attente','confirmee','en_cours')
      and tstzrange(date_debut, date_fin, '[)') && tstzrange(p_debut, p_fin, '[)')
  ) and exists (select 1 from studios where id = p_studio and statut not in ('hors_service','maintenance') and publie)
$$;

create or replace function studios_disponibles(p_debut timestamptz, p_fin timestamptz)
returns setof studios language sql stable security definer set search_path = public as $$
  select s.* from studios s
  where s.publie and s.statut not in ('hors_service','maintenance')
    and studio_disponible(s.id, p_debut, p_fin)
  order by s.code
$$;

-- ---------- 3) Photos des pannes (bucket public « maintenance », écriture par le personnel) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maintenance', 'maintenance', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "photos maintenance: lecture personnel" on storage.objects;
drop policy if exists "photos maintenance: ajout personnel" on storage.objects;
drop policy if exists "photos maintenance: suppression gestion" on storage.objects;
create policy "photos maintenance: lecture personnel" on storage.objects for select to authenticated
  using (bucket_id = 'maintenance' and public.est_staff());
create policy "photos maintenance: ajout personnel" on storage.objects for insert to authenticated
  with check (bucket_id = 'maintenance' and public.est_staff());
create policy "photos maintenance: suppression gestion" on storage.objects for delete to authenticated
  using (bucket_id = 'maintenance' and public.est_staff(array['admin','gerant']::public.role_staff[]));

-- ---------- 4) Inventaire par studio ----------
create table if not exists inventaire (
  id          uuid primary key default gen_random_uuid(),
  studio_id   uuid not null references studios(id) on delete cascade,
  article     text not null,
  quantite    int  not null default 1 check (quantite >= 0),
  etat        text not null default 'bon' check (etat in ('bon','use','a_remplacer')),
  notes       text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles(id),
  unique (studio_id, article)
);

create or replace function inventaire_horodatage() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists trg_inventaire_horodatage on inventaire;
create trigger trg_inventaire_horodatage before insert or update on inventaire
  for each row execute function inventaire_horodatage();

alter table inventaire enable row level security;
drop policy if exists "inventaire: lecture"     on inventaire;
drop policy if exists "inventaire: ajout"       on inventaire;
drop policy if exists "inventaire: mise à jour" on inventaire;
drop policy if exists "inventaire: suppression" on inventaire;
create policy "inventaire: lecture"     on inventaire for select using (est_staff());
create policy "inventaire: ajout"       on inventaire for insert with check (est_staff());
create policy "inventaire: mise à jour" on inventaire for update using (est_staff());
create policy "inventaire: suppression" on inventaire for delete using (est_staff(array['admin','gerant','receptionniste']::role_staff[]));

-- Vérification
select 'Maintenance et inventaire prêts' as resultat;
