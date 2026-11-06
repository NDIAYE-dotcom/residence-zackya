-- =====================================================================
--  023 — Réservation en ligne : jusqu'à 6 mois (au lieu de 3)
--  Décision d'Ousmane : la Mensualité étant une formule principale.
--  Seule la limite de durée change. Au-delà : passage par la réception.
--  (186 jours : 6 mois du calendrier font au plus 184 jours.)
-- =====================================================================

create or replace function creer_reservation_publique(
  p_studio uuid, p_formule formule_location, p_debut timestamptz, p_fin timestamptz,
  p_nom text, p_phone text, p_email text default null, p_nb_personnes int default 1, p_notes text default null
) returns table (reference text, montant int)
language plpgsql security definer set search_path = public as $$
declare v_client uuid; v_montant int; v_ref text; v_id uuid; v_capacite int; v_nom text := trim(p_nom); v_phone text := trim(p_phone);
begin
  -- Contrôles des données saisies
  if coalesce(length(v_nom), 0) < 2 or length(v_nom) > 80 then raise exception 'Indiquez votre nom complet.'; end if;
  if v_phone !~ '^\+221(7[05678]|33)[0-9]{7}$' then raise exception 'Numéro de téléphone sénégalais invalide.'; end if;
  if p_email is not null and trim(p_email) <> '' and trim(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Adresse email invalide.';
  end if;
  if p_fin <= p_debut then raise exception 'Le départ doit être après l''arrivée.'; end if;
  if p_debut < now() - interval '15 minutes' then raise exception 'La date d''arrivée est passée.'; end if;
  if p_fin - p_debut > interval '186 days' then raise exception 'Pour un séjour de plus de 6 mois, contactez la réception.'; end if;
  if length(coalesce(p_notes, '')) > 500 then raise exception 'Message trop long (500 caractères maximum).'; end if;

  select capacite into v_capacite from studios where id = p_studio and publie;
  if not found then raise exception 'Ce studio n''est pas disponible à la réservation en ligne.'; end if;
  if p_nb_personnes < 1 or p_nb_personnes > v_capacite then
    raise exception 'Ce studio accueille au maximum % personne(s).', v_capacite;
  end if;
  if not studio_disponible(p_studio, p_debut, p_fin) then raise exception 'Studio non disponible sur cette période.'; end if;

  -- Client : retrouvé par son téléphone, sinon créé
  select c.id into v_client from clients c where c.phone = v_phone limit 1;
  if v_client is null then
    insert into clients (full_name, phone, email) values (v_nom, v_phone, nullif(lower(trim(p_email)), '')) returning id into v_client;
  end if;
  if (select c.liste_noire from clients c where c.id = v_client) then
    raise exception 'Réservation impossible en ligne, merci de contacter la réception.';
  end if;

  -- Anti-abus : 3 réservations en attente maximum par numéro
  if (select count(*) from reservations r where r.client_id = v_client and r.statut = 'en_attente' and r.source = 'site') >= 3 then
    raise exception 'Vous avez déjà 3 réservations en attente : la réception va vous contacter.';
  end if;

  v_montant := calculer_prix(p_studio, p_formule, p_debut, p_fin);

  insert into reservations (studio_id, client_id, formule, date_debut, date_fin, nb_personnes, source, montant_total, notes)
  values (p_studio, v_client, p_formule, p_debut, p_fin, p_nb_personnes, 'site', v_montant,
          nullif(trim(coalesce(p_notes, '')), ''))
  returning reservations.id, reservations.reference into v_id, v_ref;

  insert into journal_activite (user_id, action, cible_table, cible_id, details)
  values (null, 'reservation.creee', 'reservations', v_id,
          jsonb_build_object('reference', v_ref, 'montant', v_montant, 'statut', 'en_attente', 'source', 'site'));

  return query select v_ref, v_montant;
end $$;

-- Vérification : doit afficher 1
select count(*) as limite_6_mois
from pg_proc where proname = 'creer_reservation_publique' and prosrc like '%186 days%';
