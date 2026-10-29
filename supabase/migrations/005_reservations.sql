-- =====================================================================
--  005 — Réservations (administration)
--  À exécuter dans : Supabase > SQL Editor > New query
--
--  1) studios_libres_staff : studios libres + prix calculé, en une requête
--     (inclut les studios non publiés sur le site, exclut « hors service »)
--  2) creer_reservation_staff : réservation + acompte + journal en UNE transaction
--     (si une étape échoue, rien n'est enregistré)
-- =====================================================================

-- ---------- 1) Studios libres sur une période, avec le prix ----------
-- p_exclure : réservation à ignorer (servira pour « Prolonger » / « Changer de studio »)
create or replace function studios_libres_staff(
  p_formule formule_location, p_debut timestamptz, p_fin timestamptz, p_exclure uuid default null
) returns table (
  studio_id uuid, code text, nom text, capacite int, statut statut_studio, publie boolean,
  categorie text, prix_unitaire int, prix int
)
language sql stable security invoker set search_path = public as $$
  select s.id, s.code, s.nom, s.capacite, s.statut, s.publie, c.nom, t.prix,
         calculer_prix(s.id, p_formule, p_debut, p_fin)
  from studios s
  join tarifs t on t.studio_id = s.id and t.formule = p_formule and t.actif
  left join categories c on c.id = s.categorie_id
  where s.statut <> 'hors_service'
    and not exists (
      select 1 from reservations r
      where r.studio_id = s.id
        and r.statut in ('en_attente','confirmee','en_cours')
        and (p_exclure is null or r.id <> p_exclure)
        and tstzrange(r.date_debut, r.date_fin, '[)') && tstzrange(p_debut, p_fin, '[)')
    )
  order by s.code
$$;

revoke execute on function studios_libres_staff(formule_location, timestamptz, timestamptz, uuid) from public, anon;
grant  execute on function studios_libres_staff(formule_location, timestamptz, timestamptz, uuid) to authenticated;

-- ---------- 2) Création d'une réservation par le personnel ----------
-- Le prix est TOUJOURS recalculé ici (jamais envoyé par le navigateur).
-- Chevauchement → erreur 23P01 (contrainte pas_de_chevauchement).
create or replace function creer_reservation_staff(
  p_studio uuid, p_client uuid, p_formule formule_location, p_debut timestamptz, p_fin timestamptz,
  p_nb_personnes int default 1,
  p_source source_reservation default 'sur_place',
  p_statut statut_reservation default 'confirmee',
  p_remise int default 0,
  p_caution int default 0,
  p_notes text default null,
  p_acompte int default 0,
  p_mode mode_paiement default null,
  p_reference_transaction text default null
) returns table (res_id uuid, res_reference text, res_montant int)
language plpgsql security invoker set search_path = public as $$
declare v_montant int; v_id uuid; v_ref text;
begin
  if not est_staff(array['admin','gerant','receptionniste']::role_staff[]) then
    raise exception 'Vous n''avez pas les droits pour créer une réservation.';
  end if;
  if p_statut not in ('en_attente','confirmee') then raise exception 'Statut initial invalide.'; end if;
  if p_fin <= p_debut then raise exception 'La date de départ doit être après l''arrivée.'; end if;
  if p_nb_personnes < 1 then raise exception 'Nombre de personnes invalide.'; end if;
  if exists (select 1 from studios s where s.id = p_studio and s.statut = 'hors_service') then
    raise exception 'Ce studio est hors service.';
  end if;

  v_montant := calculer_prix(p_studio, p_formule, p_debut, p_fin);

  if p_remise < 0 or p_remise > v_montant then raise exception 'La remise doit être comprise entre 0 et le montant.'; end if;
  if p_caution < 0 then raise exception 'Caution invalide.'; end if;
  if p_acompte < 0 or p_acompte > v_montant - p_remise then raise exception 'L''acompte dépasse le montant à payer.'; end if;
  if p_acompte > 0 and p_mode is null then raise exception 'Choisissez le mode de paiement de l''acompte.'; end if;

  insert into reservations (studio_id, client_id, formule, date_debut, date_fin, nb_personnes, statut, source,
                            montant_total, remise, caution, notes, created_by)
  values (p_studio, p_client, p_formule, p_debut, p_fin, p_nb_personnes, p_statut, p_source,
          v_montant, p_remise, p_caution, nullif(trim(p_notes), ''), auth.uid())
  returning reservations.id, reservations.reference into v_id, v_ref;

  if p_acompte > 0 then
    insert into paiements (reservation_id, montant, mode, type, reference_transaction, recu_par)
    values (v_id, p_acompte, p_mode, 'acompte', nullif(trim(p_reference_transaction), ''), auth.uid());
  end if;

  insert into journal_activite (user_id, action, cible_table, cible_id, details)
  values (auth.uid(), 'reservation.creee', 'reservations', v_id,
          jsonb_build_object('reference', v_ref, 'montant', v_montant, 'remise', p_remise, 'acompte', p_acompte, 'statut', p_statut));

  return query select v_id, v_ref, v_montant;
end $$;

revoke execute on function creer_reservation_staff(uuid, uuid, formule_location, timestamptz, timestamptz, int, source_reservation, statut_reservation, int, int, text, int, mode_paiement, text) from public, anon;
grant  execute on function creer_reservation_staff(uuid, uuid, formule_location, timestamptz, timestamptz, int, source_reservation, statut_reservation, int, int, text, int, mode_paiement, text) to authenticated;

-- Index utiles aux filtres de la liste
create index if not exists reservations_studio_idx on reservations (studio_id);
create index if not exists paiements_reservation_idx on paiements (reservation_id);

-- Vérification : studios libres demain soir en nuitée (doit lister vos studios avec un tarif nuitée)
-- NB : dans le SQL Editor vous n'êtes pas « connecté » comme employé, la liste est quand même calculée.
select code, nom, prix from studios_libres_staff('nuitee', (current_date + 1) + time '18:00', (current_date + 2) + time '12:00');
