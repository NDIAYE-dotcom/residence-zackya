-- =====================================================================
--  017 — Site public : statut d'une réservation avec la référence seule
--  À exécuter dans : Supabase > SQL Editor > New query
--
--  Avec la référence SEULE : statut, studio, formule, dates — rien de personnel
--  (ni nom, ni téléphone, ni montants). Le détail du paiement reste protégé
--  par la fonction suivre_reservation (référence + téléphone).
-- =====================================================================

create or replace function statut_reservation_public(p_reference text)
returns table (reference text, statut statut_reservation, studio text, studio_id uuid,
               formule formule_location, date_debut timestamptz, date_fin timestamptz)
language sql stable security definer set search_path = public as $$
  select r.reference, r.statut, s.nom, s.id, r.formule, r.date_debut, r.date_fin
  from reservations r
  join studios s on s.id = r.studio_id
  where r.reference = upper(trim(p_reference))
$$;

grant execute on function statut_reservation_public(text) to anon, authenticated;

-- Vérification : la dernière réservation (remplace par n'importe quelle référence)
select * from statut_reservation_public((select reference from reservations order by created_at desc limit 1));
