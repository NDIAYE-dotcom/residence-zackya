-- =====================================================================
--  011 — Correctif rapports : occupation d'un studio sans réservation
--  À exécuter dans : Supabase > SQL Editor > New query
--
--  Bug : un studio sans aucune réservation sur la période apparaissait occupé à 100 %
--  (LEAST / GREATEST ignorent les valeurs NULL de la jointure vide).
--  Correctif : les heures ne sont additionnées que pour les vraies réservations.
-- =====================================================================

create or replace function rapport_periode(p_du date, p_au date)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  v_debut timestamptz := p_du::timestamp at time zone 'Africa/Dakar';
  v_fin   timestamptz := (p_au + 1)::timestamp at time zone 'Africa/Dakar';
  v_heures numeric := extract(epoch from (v_fin - v_debut)) / 3600.0;
  v_pas interval := case when p_au - p_du <= 62 then interval '1 day' else interval '1 month' end;
  v jsonb;
begin
  if not est_staff(array['admin','gerant','comptable']::role_staff[]) then
    raise exception 'Les rapports sont réservés à l''administration, au gérant et au comptable.';
  end if;
  if p_au < p_du then raise exception 'La date de fin doit être après la date de début.'; end if;

  with
  pay as (  -- paiements de la période, avec leur part de CA
    select p.montant * (case when p.type::text = 'remboursement' then -1
                             when p.type::text in ('acompte','solde','extra') then 1 else 0 end) as ca,
           p.created_at, r.id as resa_id, r.studio_id, r.formule, r.source, r.client_id
    from paiements p join reservations r on r.id = p.reservation_id
    where p.created_at >= v_debut and p.created_at < v_fin
  ),
  dep as (
    select * from depenses where date_depense between p_du and p_au
  ),
  occ as (  -- heures occupées par studio sur la période
    select s.id, s.code, s.nom, s.statut,
           -- « filter » : un studio sans réservation compte 0 h (LEAST/GREATEST ignorent les NULL
           -- et donneraient sinon toute la période)
           coalesce(sum(greatest(0, extract(epoch from (
             least(case when r.statut = 'terminee' and r.checkout_at is not null
                        then least(r.checkout_at, r.date_fin) else r.date_fin end, v_fin)
             - greatest(r.date_debut, v_debut))) / 3600.0)) filter (where r.id is not null), 0) as heures
    from studios s
    left join reservations r on r.studio_id = s.id
      and r.statut in ('confirmee','en_cours','terminee')
      and r.date_debut < v_fin and r.date_fin > v_debut
    group by s.id
  ),
  resas as (  -- réservations créées pendant la période
    select * from reservations where created_at >= v_debut and created_at < v_fin
  )
  select jsonb_build_object(
    'ca',             (select coalesce(sum(ca), 0) from pay),
    'cautions',       (select coalesce(sum(p.montant), 0) from paiements p
                        where p.type::text = 'caution' and p.created_at >= v_debut and p.created_at < v_fin),
    'depenses',       (select coalesce(sum(montant), 0) from dep),
    'heures_periode', round(v_heures),
    'heures_occupees', (select round(coalesce(sum(heures), 0)) from occ where statut <> 'hors_service'),
    'nb_studios',     (select count(*) from occ where statut <> 'hors_service'),
    'nb_reservations', (select count(*) from resas where statut not in ('annulee','no_show')),
    'nb_annulations',  (select count(*) from resas where statut in ('annulee','no_show')),

    'par_studio', (select coalesce(jsonb_agg(jsonb_build_object(
        'code', o.code, 'nom', o.nom, 'heures', round(o.heures),
        'ca', coalesce(pc.ca, 0), 'depenses', coalesce(dc.total, 0)) order by o.code), '[]'::jsonb)
      from occ o
      left join (select studio_id, sum(ca) as ca from pay group by studio_id) pc on pc.studio_id = o.id
      left join (select studio_id, sum(montant) as total from dep group by studio_id) dc on dc.studio_id = o.id),

    'par_formule', (select coalesce(jsonb_agg(jsonb_build_object('cle', formule, 'ca', ca, 'nb', nb) order by ca desc), '[]'::jsonb)
      from (select formule::text, sum(ca) as ca, count(distinct resa_id) as nb from pay group by formule) t),

    'par_source', (select coalesce(jsonb_agg(jsonb_build_object('cle', source, 'ca', ca, 'nb', nb) order by ca desc), '[]'::jsonb)
      from (select source::text, sum(ca) as ca, count(distinct resa_id) as nb from pay group by source) t),

    'top_clients', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'nom', c.full_name, 'phone', c.phone,
        'ca', t.ca, 'nb', t.nb) order by t.ca desc), '[]'::jsonb)
      from (select client_id, sum(ca) as ca, count(distinct resa_id) as nb from pay
            group by client_id having sum(ca) > 0 order by sum(ca) desc limit 10) t
      join clients c on c.id = t.client_id),

    'depenses_categories', (select coalesce(jsonb_agg(jsonb_build_object('cle', categorie, 'total', total) order by total desc), '[]'::jsonb)
      from (select categorie, sum(montant) as total from dep group by categorie) t),

    'granularite', case when v_pas = interval '1 day' then 'jour' else 'mois' end,
    'serie', (select coalesce(jsonb_agg(jsonb_build_object(
        'debut', to_char(g.d, 'YYYY-MM-DD'),
        'ca', (select coalesce(sum(ca), 0) from pay
               where created_at >= (g.d::timestamp at time zone 'Africa/Dakar')
                 and created_at <  ((g.d + v_pas)::timestamp at time zone 'Africa/Dakar')),
        'depenses', (select coalesce(sum(montant), 0) from dep
                     where date_depense >= g.d::date and date_depense < (g.d + v_pas)::date)
      ) order by g.d), '[]'::jsonb)
      from generate_series(
        case when v_pas = interval '1 day' then p_du::timestamp else date_trunc('month', p_du::timestamp) end,
        p_au::timestamp, v_pas) as g(d))
  ) into v;

  return v;
end $$;

select 'Correctif occupation appliqué' as resultat;
