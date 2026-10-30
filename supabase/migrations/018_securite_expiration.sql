-- =====================================================================
--  018 — Qualité : sécurité renforcée par rôle + expiration automatique
--  À exécuter dans : Supabase > SQL Editor > New query
--
--  (Contient aussi la migration 017 — suivi par référence — si elle n'avait
--   pas été exécutée : sans danger de la relancer.)
-- =====================================================================

-- ---------- 0) Suivi par référence seule (migration 017) ----------
create or replace function statut_reservation_public(p_reference text)
returns table (reference text, statut statut_reservation, studio text, studio_id uuid,
               formule formule_location, date_debut timestamptz, date_fin timestamptz)
language sql stable security definer set search_path = public as $$
  select r.reference, r.statut, s.nom, s.id, r.formule, r.date_debut, r.date_fin
  from reservations r join studios s on s.id = r.studio_id
  where r.reference = upper(trim(p_reference))
$$;
grant execute on function statut_reservation_public(text) to anon, authenticated;

-- ---------- 1) Réservations : on ne peut plus les modifier qu'à travers les fonctions contrôlées ----------
-- Ces fonctions vérifient déjà le rôle, les règles (transitions, pièce d'identité, prix recalculé…).
-- En « definer », elles n'ont plus besoin que la réception ait un droit d'écriture direct sur la table :
-- personne ne peut donc contourner les règles en écrivant directement (ex. changer un montant).
alter function creer_reservation_staff(uuid, uuid, formule_location, timestamptz, timestamptz, int, source_reservation, statut_reservation, int, int, text, int, mode_paiement, text) security definer;
alter function changer_statut_reservation(uuid, statut_reservation, text) security definer;
alter function prolonger_reservation(uuid, timestamptz) security definer;

drop policy if exists "résa: création" on reservations;
drop policy if exists "résa: modif"    on reservations;
drop policy if exists "résa: création admin" on reservations;
drop policy if exists "résa: modif admin"    on reservations;
create policy "résa: création admin" on reservations for insert with check (est_staff(array['admin']::role_staff[]));
create policy "résa: modif admin"    on reservations for update using (est_staff(array['admin']::role_staff[]));

-- ---------- 2) Studios : le ménage ne modifie plus les studios directement ----------
-- (le passage « nettoyage → disponible » est fait par la base quand le ménage est terminé)
drop policy if exists "ménage: statut studio" on studios;

-- ---------- 3) Ménage et maintenance : suppression réservée à l'admin et au gérant ----------
drop policy if exists "ménage: tout staff" on taches_menage;
drop policy if exists "ménage: lecture" on taches_menage;
drop policy if exists "ménage: ajout" on taches_menage;
drop policy if exists "ménage: mise à jour" on taches_menage;
drop policy if exists "ménage: suppression gestion" on taches_menage;
create policy "ménage: lecture"     on taches_menage for select using (est_staff());
create policy "ménage: ajout"       on taches_menage for insert with check (est_staff());
create policy "ménage: mise à jour" on taches_menage for update using (est_staff());
create policy "ménage: suppression gestion" on taches_menage for delete using (est_staff(array['admin','gerant']::role_staff[]));

drop policy if exists "maintenance: tout staff" on maintenances;
drop policy if exists "maintenance: lecture" on maintenances;
drop policy if exists "maintenance: ajout" on maintenances;
drop policy if exists "maintenance: mise à jour" on maintenances;
drop policy if exists "maintenance: suppression gestion" on maintenances;
create policy "maintenance: lecture"     on maintenances for select using (est_staff());
create policy "maintenance: ajout"       on maintenances for insert with check (est_staff());
create policy "maintenance: mise à jour" on maintenances for update using (est_staff());
create policy "maintenance: suppression gestion" on maintenances for delete using (est_staff(array['admin','gerant']::role_staff[]));

-- ---------- 4) Traçabilité infalsifiable ----------
-- Le journal ne peut être écrit qu'au nom de la personne connectée
drop policy if exists "journal: écriture" on journal_activite;
create policy "journal: écriture" on journal_activite for insert
  with check (est_staff() and user_id = auth.uid());

-- Un paiement est enregistré au nom de la personne connectée (pas d'un collègue)
drop policy if exists "paiements: création" on paiements;
create policy "paiements: création" on paiements for insert
  with check (est_staff(array['admin','gerant','receptionniste']::role_staff[]) and (recu_par is null or recu_par = auth.uid()));

-- ---------- 5) Expiration automatique des demandes en ligne non confirmées ----------
insert into parametres (cle, valeur) values ('expiration_attente_heures', '24') on conflict (cle) do nothing;

-- Annule les réservations du site restées « en attente » plus de N heures (paramètre, 0 = jamais)
-- sauf si le client a déjà payé quelque chose. Renvoie le nombre de réservations annulées.
create or replace function expirer_reservations_en_attente()
returns int language plpgsql security definer set search_path = public as $$
declare v_heures int; v_nombre int;
begin
  select coalesce(nullif(valeur, '')::int, 0) into v_heures from parametres where cle = 'expiration_attente_heures';
  if coalesce(v_heures, 0) <= 0 then return 0; end if;

  with expirees as (
    update reservations r
    set statut = 'annulee',
        motif_annulation = format('Annulation automatique : demande non confirmée dans les %s h', v_heures),
        annulee_le = now()
    where r.statut = 'en_attente' and r.source = 'site'
      and r.created_at < now() - make_interval(hours => v_heures)
      and not exists (select 1 from paiements p where p.reservation_id = r.id)
    returning r.id, r.reference
  )
  insert into journal_activite (user_id, action, cible_table, cible_id, details)
  select null, 'reservation.annulee', 'reservations', e.id,
         jsonb_build_object('reference', e.reference, 'motif', 'Expiration automatique', 'avant', 'en_attente')
  from expirees e;

  get diagnostics v_nombre = row_count;
  return v_nombre;
end $$;

revoke execute on function expirer_reservations_en_attente() from public, anon, authenticated;

-- Planification toutes les 15 minutes (extension pg_cron de Supabase)
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'zaquia-expiration-attente';
select cron.schedule('zaquia-expiration-attente', '*/15 * * * *', 'select public.expirer_reservations_en_attente()');

-- Vérification : la tâche planifiée et les nouvelles règles
select jobname, schedule, active from cron.job where jobname = 'zaquia-expiration-attente';
