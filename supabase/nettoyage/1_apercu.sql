-- =====================================================================
--  Nettoyage avant ouverture — ÉTAPE 1 : APERÇU (LECTURE SEULE)
--  Cette requête ne modifie RIEN : elle liste ce qui existe dans la base.
--  Une seule requête, car le SQL Editor n'affiche que le dernier résultat.
-- =====================================================================

with resa as (
  select r.client_id,
         count(*) as nb,
         string_agg(
           r.reference || ' (' || r.statut::text || ', ' || r.source::text || ', arrivée '
             || to_char(r.date_debut at time zone 'Africa/Dakar', 'DD/MM/YY') || ', '
             || (r.montant_total - r.remise)::text || ' F)',
           ' ; ' order by r.created_at) as liste
  from reservations r
  group by r.client_id
),
paye as (
  select r.client_id, sum(p.montant) as total
  from paiements p join reservations r on r.id = p.reservation_id
  group by r.client_id
)
select rubrique, element, detail from (

  -- 1) Totaux
  select 1 as ordre, 'A. TOTAUX' as rubrique, 'Réservations' as element, count(*)::text as detail from reservations
  union all select 1, 'A. TOTAUX', 'Paiements', count(*)::text || ' ligne(s), ' || coalesce(sum(montant), 0)::text || ' F' from paiements
  union all select 1, 'A. TOTAUX', 'Clients', count(*)::text from clients
  union all select 1, 'A. TOTAUX', 'Clôtures de caisse', count(*)::text from clotures_caisse
  union all select 1, 'A. TOTAUX', 'Dépenses', count(*)::text || ' ligne(s), ' || coalesce(sum(montant), 0)::text || ' F' from depenses
  union all select 1, 'A. TOTAUX', 'Tâches de ménage', count(*)::text from taches_menage
  union all select 1, 'A. TOTAUX', 'Pannes (maintenance)', count(*)::text from maintenances
  union all select 1, 'A. TOTAUX', 'Articles d''inventaire', count(*)::text from inventaire
  union all select 1, 'A. TOTAUX', 'Lignes du journal', count(*)::text from journal_activite
  union all select 1, 'A. TOTAUX', 'Dernier n° de réservation', last_value::text from reservation_seq
  union all select 1, 'A. TOTAUX', 'Dernier n° de reçu', last_value::text from recu_seq

  -- 2) Clients et leurs réservations
  union all
  select 2, 'B. CLIENTS', c.full_name || ' · ' || c.phone || coalesce(' · ' || c.email, ''),
         coalesce(resa.nb, 0)::text || ' réservation(s), payé ' || coalesce(paye.total, 0)::text || ' F'
           || case when c.liste_noire then ' · LISTE NOIRE' else '' end
           || coalesce(' → ' || resa.liste, '')
  from clients c
  left join resa on resa.client_id = c.id
  left join paye on paye.client_id = c.id

  -- 3) Comptes du personnel
  union all
  select 3, 'C. COMPTES', coalesce(nullif(p.full_name, ''), '(sans nom)') || ' · ' || coalesce(u.email, '?'),
         p.role::text || case when p.actif then ', actif' else ', désactivé' end
           || ', dernière connexion : ' || coalesce(to_char(u.last_sign_in_at at time zone 'Africa/Dakar', 'DD/MM/YY HH24:MI'), 'jamais')
  from profiles p
  left join auth.users u on u.id = p.id

  -- 4) Dépenses, pannes et clôtures : à vérifier une par une
  union all
  select 4, 'D. DÉPENSES', to_char(date_depense, 'DD/MM/YY') || ' · ' || categorie || ' · ' || libelle, montant::text || ' F' from depenses
  union all
  select 5, 'E. PANNES', m.titre || ' (' || s.nom || ')', m.statut::text || ', ' || m.priorite::text
  from maintenances m join studios s on s.id = m.studio_id
  union all
  select 6, 'F. CLÔTURES', to_char(jour, 'DD/MM/YY'), 'clôturée' from clotures_caisse

) lignes
order by ordre, element;
