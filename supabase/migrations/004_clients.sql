-- =====================================================================
--  004 — Clients : motif de liste noire + vue avec statistiques
--  À exécuter dans : Supabase > SQL Editor > New query
-- =====================================================================

-- 1) Liste noire : pourquoi et quand
alter table clients add column if not exists liste_noire_motif text;
alter table clients add column if not exists liste_noire_le timestamptz;

-- 2) Recherche rapide par nom (insensible à la casse)
create index if not exists clients_nom_idx on clients (lower(full_name));
create index if not exists reservations_client_idx on reservations (client_id);

-- 3) Vue clients + statistiques (respecte les droits de l'utilisateur connecté)
--    total_depense = acomptes + soldes + extras - remboursements (hors cautions)
create or replace view v_clients with (security_invoker = true) as
select
  c.*,
  coalesce(r.nb_reservations, 0) as nb_reservations,
  coalesce(r.nb_sejours, 0)      as nb_sejours,
  r.dernier_sejour,
  coalesce(p.total_depense, 0)   as total_depense
from clients c
left join lateral (
  select count(*)                                                         as nb_reservations,
         count(*) filter (where statut = 'terminee')                      as nb_sejours,
         max(date_debut) filter (where statut in ('confirmee','en_cours','terminee')) as dernier_sejour
  from reservations where client_id = c.id
) r on true
left join lateral (
  select sum(case when pa.type = 'remboursement' then -pa.montant else pa.montant end) as total_depense
  from paiements pa join reservations re on re.id = pa.reservation_id
  where re.client_id = c.id and pa.type in ('acompte','solde','extra','remboursement')
) p on true;

-- Vérification : doit renvoyer 0 ligne (aucun client pour l'instant) sans erreur
select count(*) as nb_clients from v_clients;
