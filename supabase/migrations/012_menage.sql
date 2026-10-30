-- =====================================================================
--  012 — Ménage : suivi des tâches, équipe, temps réel
--  À exécuter dans : Supabase > SQL Editor > New query
-- =====================================================================

-- ---------- 1) Qui a fait le ménage, et quand ----------
alter table taches_menage add column if not exists commencee_le timestamptz;
alter table taches_menage add column if not exists terminee_par uuid references profiles(id);
create index if not exists taches_menage_statut_idx on taches_menage (statut);
create index if not exists taches_menage_studio_idx on taches_menage (studio_id);

-- Commencer → heure de début ; Terminer → heure de fin, auteur, et studio « Disponible »
-- (seulement s'il ne reste aucune autre tâche en cours sur ce studio)
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
    update studios set statut = 'disponible'
    where id = new.studio_id and statut = 'nettoyage'
      and not exists (select 1 from taches_menage t
                      where t.studio_id = new.studio_id and t.id <> new.id and t.statut <> 'terminee');
  end if;
  return new;
end $$;

-- ---------- 2) Vue des tâches : studio, personne assignée, prochaine arrivée ----------
create or replace view v_taches_menage with (security_invoker = true) as
select
  t.*,
  s.code   as studio_code,
  s.nom    as studio_nom,
  s.statut as studio_statut,
  pa.full_name as assigne_nom,
  pt.full_name as terminee_par_nom,
  (select min(r.date_debut) from reservations r
    where r.studio_id = t.studio_id and r.statut in ('en_attente','confirmee')
      and r.date_debut >= now() - interval '12 hours') as prochaine_arrivee
from taches_menage t
join studios s on s.id = t.studio_id
left join profiles pa on pa.id = t.assigne_a
left join profiles pt on pt.id = t.terminee_par;

-- ---------- 3) Équipe de ménage (pour l'assignation, lisible par tout le personnel) ----------
create or replace function personnel_menage()
returns table (id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name from profiles p
  where p.actif and p.role = 'menage' and est_staff()
  order by p.full_name
$$;
revoke execute on function personnel_menage() from public, anon;
grant  execute on function personnel_menage() to authenticated;

-- ---------- 4) Temps réel ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'taches_menage') then
    alter publication supabase_realtime add table taches_menage;
  end if;
end $$;

-- Vérification : vos tâches de ménage (créées par les check-out)
select studio_code, statut, created_at from v_taches_menage order by created_at desc limit 5;
