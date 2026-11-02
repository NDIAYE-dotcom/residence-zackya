-- =====================================================================
--  021 — Prix : semaine et mensualité comptées au calendrier
--
--  Avant : semaine = tranches de 168 h, mois = tranches de 720 h (30 jours).
--   → un mois de 31 jours (1er déc. → 1er janv.) était facturé 2 mensualités ;
--     7 nuits avec arrivée le matin (10 h → 12 h) étaient facturées 2 semaines.
--  Maintenant (comme la nuitée, comptée par nuit calendaire) :
--   - semaine    = nombre de nuits ÷ 7, arrondi au supérieur
--   - mensualité = mois du calendrier (1er déc. → 1er janv. = 1 ; 31 janv. → 28 févr. = 1 ;
--                  1er janv. → 3 févr. = 2, mois commencé)
--  L'heure, la demi-journée et la journée ne changent pas.
--  Les montants des réservations déjà enregistrées ne changent pas.
-- =====================================================================

create or replace function calculer_prix(p_studio uuid, p_formule formule_location, p_debut timestamptz, p_fin timestamptz)
returns int language plpgsql stable security definer set search_path = public as $$
declare
  t tarifs%rowtype;
  unites int;
  j_debut date := (p_debut at time zone 'Africa/Dakar')::date;
  j_fin   date := (p_fin   at time zone 'Africa/Dakar')::date;
  ecart interval;
begin
  select * into t from tarifs where studio_id = p_studio and formule = p_formule and actif;
  if not found then raise exception 'Aucun tarif "%" pour ce studio', p_formule; end if;

  if p_formule = 'nuitee' then
    unites := j_fin - j_debut;                          -- nuits calendaires
  elsif p_formule = 'semaine' then
    unites := ceil((j_fin - j_debut) / 7.0);            -- 7 nuits = 1 semaine
  elsif p_formule = 'mois' then
    ecart := age(j_fin, j_debut);                       -- ex. « 1 mon 2 days »
    unites := (extract(year from ecart) * 12 + extract(month from ecart))::int
              + case when extract(day from ecart) > 0 then 1 else 0 end;
  else
    unites := ceil(extract(epoch from (p_fin - p_debut)) / 3600.0 / t.duree_heures);
  end if;

  return greatest(1, unites) * t.prix;
end $$;

-- Vérification avec le premier studio qui a une mensualité (prix unitaire, puis attendu = 1 mensualité / 1 semaine)
with s as (select studio_id from tarifs where formule = 'mois' and actif limit 1)
select
  calculer_prix(s.studio_id, 'mois',    '2026-12-01 14:00+00', '2027-01-01 12:00+00') as mois_31_jours_1_mensualite,
  calculer_prix(s.studio_id, 'mois',    '2027-01-01 14:00+00', '2027-02-03 12:00+00') as mois_et_2_jours_2_mensualites,
  calculer_prix(s.studio_id, 'semaine', '2026-12-07 10:00+00', '2026-12-14 12:00+00') as semaine_7_nuits_1_semaine,
  calculer_prix(s.studio_id, 'nuitee',  '2026-12-07 18:00+00', '2026-12-09 12:00+00') as nuitee_2_nuits
from s;
