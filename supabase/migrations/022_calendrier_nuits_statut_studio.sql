-- =====================================================================
--  022 — Calendrier public par nuit + studios qui restaient bloqués
--
--  1) Calendrier : un soir déjà réservé s'affichait « partiel » et restait
--     cliquable, puis la réservation répondait « Déjà réservé ».
--     Maintenant un jour est « complet » dès que sa NUIT est prise.
--  2) Panne urgente supprimée ou rétrogradée : le studio restait en
--     « Maintenance », donc caché du site.
--  3) Panne résolue alors que le ménage n'est pas fait : le studio passait
--     « Disponible » au lieu de « Nettoyage ».
--  4) Tâche de ménage supprimée : le studio restait en « Nettoyage ».
--  Aucune donnée n'est modifiée.
-- =====================================================================

-- ---------- 1) Calendrier : la nuit décide ----------
create or replace function calendrier_studio(p_studio uuid, p_du date, p_au date)
returns table (jour date, occupation text)
language sql stable security definer set search_path = public as $$
  with h as (
    select coalesce((select valeur from parametres where cle = 'nuitee_debut'), '18:00')::time as debut,
           coalesce((select valeur from parametres where cle = 'nuitee_fin'), '12:00')::time as fin
  ),
  jours as (
    select d::date as jour from generate_series(p_du, p_au, interval '1 day') as d
  ),
  plages as (
    select j.jour,
           tstzrange(j.jour::timestamp at time zone 'Africa/Dakar', (j.jour + 1)::timestamp at time zone 'Africa/Dakar', '[)') as journee,
           tstzrange((j.jour + h.debut) at time zone 'Africa/Dakar', ((j.jour + 1) + h.fin) at time zone 'Africa/Dakar', '[)') as nuit
    from jours j, h
  )
  select p.jour,
         case
           when exists (select 1 from reservations r
                        where r.studio_id = p_studio and r.statut in ('en_attente','confirmee','en_cours')
                          and tstzrange(r.date_debut, r.date_fin, '[)') && p.nuit) then 'complet'
           when exists (select 1 from reservations r
                        where r.studio_id = p_studio and r.statut in ('en_attente','confirmee','en_cours')
                          and tstzrange(r.date_debut, r.date_fin, '[)') && p.journee) then 'partiel'
           else 'libre'
         end
  from plages p
  where p_au >= p_du and p_au - p_du <= 62
    and exists (select 1 from studios s where s.id = p_studio and s.publie and s.statut <> 'hors_service')
  order by p.jour
$$;

-- ---------- 2) et 3) Sortie de maintenance d'un studio ----------
-- Le studio quitte « Maintenance » s'il ne reste aucune panne urgente ouverte
-- (p_sauf = la panne en cours de résolution, de rétrogradation ou de suppression) ;
-- s'il reste un ménage à faire, il repasse par « Nettoyage ».
create or replace function liberer_studio_maintenance(p_studio uuid, p_sauf uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from maintenances m
             where m.studio_id = p_studio and m.id <> p_sauf
               and m.priorite = 'urgente' and m.statut <> 'terminee') then
    return;
  end if;
  update studios
  set statut = case when exists (select 1 from taches_menage t where t.studio_id = p_studio and t.statut <> 'terminee')
                    then 'nettoyage'::statut_studio else 'disponible'::statut_studio end
  where id = p_studio and statut = 'maintenance';
end $$;
revoke execute on function liberer_studio_maintenance(uuid, uuid) from public, anon, authenticated;

create or replace function maintenance_statut_studio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.priorite = 'urgente' and new.statut <> 'terminee' then
    update studios set statut = 'maintenance' where id = new.studio_id and statut in ('disponible','nettoyage');
  end if;
  if tg_op = 'UPDATE' and new.statut = 'terminee' and old.statut <> 'terminee' then
    new.resolu_le  := coalesce(new.resolu_le, now());
    new.resolu_par := coalesce(new.resolu_par, auth.uid());
    perform liberer_studio_maintenance(new.studio_id, new.id);
  elsif tg_op = 'UPDATE' and old.priorite = 'urgente' and old.statut <> 'terminee' and new.priorite <> 'urgente' then
    perform liberer_studio_maintenance(new.studio_id, new.id); -- panne rétrogradée
  end if;
  return new;
end $$;

create or replace function maintenance_supprimee() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.priorite = 'urgente' and old.statut <> 'terminee' then
    perform liberer_studio_maintenance(old.studio_id, old.id);
  end if;
  return old;
end $$;

drop trigger if exists trg_maintenance_supprimee on maintenances;
create trigger trg_maintenance_supprimee after delete on maintenances
  for each row execute function maintenance_supprimee();

-- ---------- 4) Tâche de ménage supprimée ----------
create or replace function menage_supprime() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.statut <> 'terminee' then
    update studios set statut = case
        when exists (select 1 from maintenances m where m.studio_id = old.studio_id
                     and m.priorite = 'urgente' and m.statut <> 'terminee') then 'maintenance'::statut_studio
        else 'disponible'::statut_studio end
    where id = old.studio_id and statut = 'nettoyage'
      and not exists (select 1 from taches_menage t
                      where t.studio_id = old.studio_id and t.id <> old.id and t.statut <> 'terminee');
  end if;
  return old;
end $$;

drop trigger if exists trg_menage_supprime on taches_menage;
create trigger trg_menage_supprime after delete on taches_menage
  for each row execute function menage_supprime();

-- Vérification : la colonne doit afficher « Correctifs appliqués »
select 'Correctifs appliqués' as resultat,
       (select count(*) from pg_trigger where tgname in ('trg_maintenance_supprimee','trg_menage_supprime')) as triggers_ajoutes;
