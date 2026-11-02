-- =====================================================================
--  020 — Formules proposées : Nuitée, Semaine, Mensualité
--  (l'heure, la demi-journée et la journée ne sont plus proposées)
--
--  - paramètre « formules_proposees » (modifiable dans Paramètres > Résidence)
--  - tarifs des formules retirées désactivés (ils restent enregistrés)
--  - garde-fou : aucune NOUVELLE réservation sur une formule retirée
--    (les anciennes réservations gardent leur formule dans l'historique)
-- =====================================================================

insert into parametres (cle, valeur) values ('formules_proposees', 'nuitee,semaine,mois')
on conflict (cle) do update set valeur = excluded.valeur;

update tarifs set actif = false where formule in ('heure', 'demi_journee', 'journee');

-- Vrai si la formule fait partie des formules proposées par la résidence
create or replace function formule_proposee(p_formule formule_location) returns boolean
language sql stable security definer set search_path = public as $$
  select p_formule::text = any (regexp_split_to_array(
    coalesce((select valeur from parametres where cle = 'formules_proposees'), 'nuitee,semaine,mois'), '\s*,\s*'))
$$;
grant execute on function formule_proposee(formule_location) to anon, authenticated;

create or replace function verifier_formule_proposee() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not formule_proposee(new.formule) then
    raise exception 'La formule « % » n''est plus proposée par la résidence.',
      case new.formule
        when 'heure' then 'À l''heure' when 'demi_journee' then 'Demi-journée' when 'journee' then 'Journée'
        when 'nuitee' then 'Nuitée' when 'semaine' then 'Semaine' else 'Mensualité' end;
  end if;
  return new;
end $$;

drop trigger if exists trg_formule_proposee on reservations;
create trigger trg_formule_proposee
  before insert on reservations
  for each row execute function verifier_formule_proposee();

-- Vérification : formules proposées + tarifs encore actifs par formule
select (select valeur from parametres where cle = 'formules_proposees') as formules_proposees,
       string_agg(distinct formule::text, ', ') filter (where actif) as tarifs_actifs
from tarifs;
