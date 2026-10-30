-- =====================================================================
--  006 — Cycle de vie d'une réservation (fiche réservation)
--  À exécuter dans : Supabase > SQL Editor > New query
--
--  Toutes les règles sont vérifiées PAR LA BASE :
--   - transitions de statut autorisées, motif obligatoire (annulation / no-show)
--   - pièce d'identité obligatoire au check-in
--   - prix recalculé quand on prolonge ou change de studio
--   - chevauchement toujours bloqué (erreur 23P01)
-- =====================================================================

-- ---------- 1) Annulation / no-show : motif, date, auteur ----------
alter table reservations add column if not exists motif_annulation text;
alter table reservations add column if not exists annulee_le timestamptz;
alter table reservations add column if not exists annulee_par uuid references profiles(id);

-- La vue fige la liste des colonnes à sa création : on la recrée pour inclure les nouvelles
drop view if exists v_reservations;
create view v_reservations with (security_invoker = true) as
select
  r.*,
  s.code  as studio_code,
  s.nom   as studio_nom,
  c.full_name as client_nom,
  c.phone     as client_phone,
  coalesce(sum(p.montant) filter (where p.type in ('acompte','solde','extra')), 0)
    - coalesce(sum(p.montant) filter (where p.type = 'remboursement'), 0) as total_paye,
  (r.montant_total - r.remise)
    - (coalesce(sum(p.montant) filter (where p.type in ('acompte','solde','extra')), 0)
       - coalesce(sum(p.montant) filter (where p.type = 'remboursement'), 0)) as reste_a_payer
from reservations r
join studios s on s.id = r.studio_id
join clients c on c.id = r.client_id
left join paiements p on p.reservation_id = r.id
group by r.id, s.code, s.nom, c.full_name, c.phone;

-- ---------- 2) Changer le statut (confirmer, check-in, check-out, annuler, no-show) ----------
-- Les triggers existants s'occupent du studio (occupé / nettoyage) et de la tâche ménage.
create or replace function changer_statut_reservation(p_id uuid, p_statut statut_reservation, p_motif text default null)
returns void language plpgsql security invoker set search_path = public as $$
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

-- ---------- 3) Prolonger / modifier le départ (prix recalculé) ----------
create or replace function prolonger_reservation(p_id uuid, p_fin timestamptz)
returns int language plpgsql security invoker set search_path = public as $$
declare r reservations%rowtype; v_montant int;
begin
  if not est_staff(array['admin','gerant','receptionniste']::role_staff[]) then
    raise exception 'Vous n''avez pas les droits pour modifier une réservation.';
  end if;
  select * into r from reservations where id = p_id for update;
  if not found then raise exception 'Réservation introuvable.'; end if;
  if r.statut not in ('en_attente','confirmee','en_cours') then
    raise exception 'Seule une réservation active peut être prolongée.';
  end if;
  if p_fin <= r.date_debut then raise exception 'Le départ doit être après l''arrivée.'; end if;

  v_montant := calculer_prix(r.studio_id, r.formule, r.date_debut, p_fin);
  if r.remise > v_montant then raise exception 'La remise dépasse le nouveau montant.'; end if;

  update reservations set date_fin = p_fin, montant_total = v_montant where id = p_id; -- 23P01 si conflit

  insert into journal_activite (user_id, action, cible_table, cible_id, details)
  values (auth.uid(), 'reservation.prolongee', 'reservations', p_id,
          jsonb_build_object('reference', r.reference, 'ancien_depart', r.date_fin, 'nouveau_depart', p_fin,
                             'ancien_montant', r.montant_total, 'nouveau_montant', v_montant));
  return v_montant;
end $$;

-- ---------- 4) Changer de studio (prix recalculé ; si client déjà installé : ancien → nettoyage) ----------
-- security definer : la réception n'a pas le droit de modifier directement les studios.
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

-- ---------- 5) Historique d'une réservation (lisible par tout le personnel concerné) ----------
create or replace function journal_reservation(p_id uuid)
returns table (le timestamptz, action text, details jsonb, auteur text)
language sql stable security definer set search_path = public as $$
  select j.created_at, j.action, j.details, coalesce(nullif(p.full_name, ''), p.email, '—')
  from journal_activite j
  left join profiles p on p.id = j.user_id
  where j.cible_id = p_id
    and est_staff(array['admin','gerant','receptionniste','comptable']::role_staff[])
  order by j.created_at desc
$$;

-- ---------- Droits : personnel connecté uniquement ----------
revoke execute on function changer_statut_reservation(uuid, statut_reservation, text) from public, anon;
revoke execute on function prolonger_reservation(uuid, timestamptz)                    from public, anon;
revoke execute on function changer_studio_reservation(uuid, uuid)                      from public, anon;
revoke execute on function journal_reservation(uuid)                                   from public, anon;
grant  execute on function changer_statut_reservation(uuid, statut_reservation, text) to authenticated;
grant  execute on function prolonger_reservation(uuid, timestamptz)                    to authenticated;
grant  execute on function changer_studio_reservation(uuid, uuid)                      to authenticated;
grant  execute on function journal_reservation(uuid)                                   to authenticated;

-- Vérification : la vue contient bien la nouvelle colonne (doit afficher vos réservations)
select reference, statut, motif_annulation, reste_a_payer from v_reservations order by created_at desc limit 5;
