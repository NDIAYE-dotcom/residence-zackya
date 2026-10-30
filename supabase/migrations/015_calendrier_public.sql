-- =====================================================================
--  015 — Site public : calendrier de disponibilité d'un studio
--  À exécuter dans : Supabase > SQL Editor > New query
--
--  Renvoie pour chaque jour : « libre », « partiel » (arrivée / départ / quelques heures)
--  ou « complet ». Aucune information sur les clients n'est exposée.
--  Limité à 62 jours par appel et aux studios publiés.
--  + coordonnées complètes (téléphone fixe, email, RCCM).
-- =====================================================================

create or replace function calendrier_studio(p_studio uuid, p_du date, p_au date)
returns table (jour date, occupation text)
language sql stable security definer set search_path = public as $$
  with jours as (
    select d::date as jour from generate_series(p_du, p_au, interval '1 day') as d
  ),
  occ as (
    select j.jour,
           -- « filter » : un jour sans réservation compte 0 h (LEAST/GREATEST ignorent les NULL)
           coalesce(sum(extract(epoch from (
               least(r.date_fin, (j.jour + 1)::timestamp at time zone 'Africa/Dakar')
             - greatest(r.date_debut, j.jour::timestamp at time zone 'Africa/Dakar'))) / 3600.0)
             filter (where r.id is not null), 0) as heures
    from jours j
    left join reservations r
      on r.studio_id = p_studio
     and r.statut in ('en_attente','confirmee','en_cours')
     and r.date_debut < (j.jour + 1)::timestamp at time zone 'Africa/Dakar'
     and r.date_fin   > j.jour::timestamp at time zone 'Africa/Dakar'
    group by j.jour
  )
  select o.jour,
         case when o.heures >= 23 then 'complet' when o.heures > 0 then 'partiel' else 'libre' end
  from occ o
  where p_au >= p_du and p_au - p_du <= 62
    and exists (select 1 from studios s where s.id = p_studio and s.publie and s.statut <> 'hors_service')
  order by o.jour
$$;

grant execute on function calendrier_studio(uuid, date, date) to anon, authenticated;

-- ---------- Coordonnées complètes de la résidence (pied de page du site, Paramètres) ----------
insert into parametres (cle, valeur) values
  ('telephone',      '+221 77 656 28 04'),
  ('telephone_fixe', '+221 33 992 52 12'),
  ('email',          'samir.kadra@gmail.com'),
  ('rccm',           '0295 A 2003 ZG')
on conflict (cle) do update set valeur = excluded.valeur;

-- Vérification : 7 prochains jours du premier studio publié
select * from calendrier_studio((select id from studios where publie order by code limit 1), current_date, current_date + 6);
