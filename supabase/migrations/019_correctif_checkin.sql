-- =====================================================================
--  019 — Correctif : check-in alors que le client précédent est encore là
--  À exécuter dans : Supabase > SQL Editor > New query
--
--  Avant : un nouveau client pouvait faire son check-in alors que le précédent
--  n'avait pas fait son check-out ; au check-out du premier, le studio passait
--  « Nettoyage » alors que le second était à l'intérieur.
--  Maintenant : check-in refusé tant que le studio est occupé ; et un check-out
--  ne met le studio en nettoyage que s'il n'y a plus personne dedans.
-- =====================================================================

-- ---------- Changer le statut (check-in protégé) ----------
create or replace function changer_statut_reservation(p_id uuid, p_statut statut_reservation, p_motif text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r reservations%rowtype;
begin
  if not est_staff(array['admin','gerant','receptionniste']::role_staff[]) then
    raise exception 'Vous n''avez pas les droits pour modifier une réservation.';
  end if;
  select * into r from reservations where id = p_id for update;
  if not found then raise exception 'Réservation introuvable.'; end if;
  if r.statut = p_statut then return; end if;

  if not (
       (r.statut = 'en_attente' and p_statut in ('confirmee','en_cours','annulee','no_show'))
    or (r.statut = 'confirmee'  and p_statut in ('en_cours','annulee','no_show'))
    or (r.statut = 'en_cours'   and p_statut = 'terminee')
  ) then
    raise exception 'Action impossible pour une réservation « % ».', r.statut;
  end if;

  if p_statut in ('annulee','no_show') and coalesce(trim(p_motif), '') = '' then
    raise exception 'Le motif est obligatoire.';
  end if;
  if p_statut = 'en_cours' and not exists (
    select 1 from clients c where c.id = r.client_id and coalesce(trim(c.piece_numero), '') <> ''
  ) then
    raise exception 'Pièce d''identité du client obligatoire pour le check-in.';
  end if;

  -- Check-in : le client précédent doit avoir fait son check-out
  if p_statut = 'en_cours' and exists (
    select 1 from reservations x where x.studio_id = r.studio_id and x.statut = 'en_cours' and x.id <> r.id
  ) then
    raise exception 'Check-in impossible : le client précédent n''a pas encore fait son check-out dans ce studio.';
  end if;

  update reservations set
    statut = p_statut,
    motif_annulation = case when p_statut in ('annulee','no_show') then trim(p_motif) else motif_annulation end,
    annulee_le       = case when p_statut in ('annulee','no_show') then now() else annulee_le end,
    annulee_par      = case when p_statut in ('annulee','no_show') then auth.uid() else annulee_par end
  where id = p_id;

  insert into journal_activite (user_id, action, cible_table, cible_id, details)
  values (auth.uid(), 'reservation.' || p_statut::text, 'reservations', p_id,
          jsonb_build_object('reference', r.reference, 'avant', r.statut, 'motif', nullif(trim(p_motif), '')));
end $$;

-- ---------- Changer de studio (studio d'arrivée libre) ----------
create or replace function changer_studio_reservation(p_id uuid, p_studio uuid)
returns int language plpgsql security definer set search_path = public as $$
declare r reservations%rowtype; v_montant int; v_ancien text; v_nouveau text;
begin
  if not est_staff(array['admin','gerant','receptionniste']::role_staff[]) then
    raise exception 'Vous n''avez pas les droits pour modifier une réservation.';
  end if;
  select * into r from reservations where id = p_id for update;
  if not found then raise exception 'Réservation introuvable.'; end if;
  if r.statut not in ('en_attente','confirmee','en_cours') then
    raise exception 'Seule une réservation active peut changer de studio.';
  end if;
  if r.studio_id = p_studio then raise exception 'C''est déjà le studio de cette réservation.'; end if;
  if exists (select 1 from studios where id = p_studio and statut = 'hors_service') then
    raise exception 'Ce studio est hors service.';
  end if;

  if r.statut = 'en_cours' and exists (select 1 from reservations x where x.studio_id = p_studio and x.statut = 'en_cours') then
    raise exception 'Ce studio est encore occupé par un autre client (check-out non fait).';
  end if;

  v_montant := calculer_prix(p_studio, r.formule, r.date_debut, r.date_fin);
  if r.remise > v_montant then raise exception 'La remise dépasse le nouveau montant.'; end if;

  update reservations set studio_id = p_studio, montant_total = v_montant where id = p_id; -- 23P01 si conflit

  if r.statut = 'en_cours' then
    update studios set statut = 'nettoyage' where id = r.studio_id;
    insert into taches_menage (studio_id, reservation_id, notes) values (r.studio_id, r.id, 'Changement de studio');
    update studios set statut = 'occupe' where id = p_studio;
  end if;

  select code into v_ancien from studios where id = r.studio_id;
  select code into v_nouveau from studios where id = p_studio;
  insert into journal_activite (user_id, action, cible_table, cible_id, details)
  values (auth.uid(), 'reservation.studio_change', 'reservations', p_id,
          jsonb_build_object('reference', r.reference, 'ancien_studio', v_ancien, 'nouveau_studio', v_nouveau,
                             'ancien_montant', r.montant_total, 'nouveau_montant', v_montant));
  return v_montant;
end $$;

-- ---------- Check-in / check-out → statut du studio (version sûre) ----------
create or replace function sync_statut_studio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.statut = 'en_cours' and old.statut is distinct from 'en_cours' then
    update studios set statut = 'occupe' where id = new.studio_id;
    new.checkin_at := coalesce(new.checkin_at, now());
  elsif new.statut = 'terminee' and old.statut = 'en_cours' then
    new.checkout_at := coalesce(new.checkout_at, now());
    insert into taches_menage (studio_id, reservation_id) values (new.studio_id, new.id);
    -- Nettoyage seulement si plus aucun autre client n'est installé dans ce studio
    if not exists (select 1 from reservations x where x.studio_id = new.studio_id and x.statut = 'en_cours' and x.id <> new.id) then
      update studios set statut = 'nettoyage' where id = new.studio_id;
    end if;
  end if;
  return new;
end $$;



-- Vérification
select 'Correctif check-in appliqué' as resultat;
