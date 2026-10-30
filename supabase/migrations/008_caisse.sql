-- =====================================================================
--  008 — Caisse : restitution de caution, n° de reçu, clôture journalière
--  À exécuter dans : Supabase > SQL Editor > New query
-- =====================================================================

-- ---------- 1) Coordonnées réelles de la résidence (reçus, WhatsApp) ----------
insert into parametres (cle, valeur) values
  ('adresse',   'Ziguinchor, Goumel'),
  ('telephone', '+221 77 656 28 04'),
  ('whatsapp',  '221776562804')
on conflict (cle) do update set valeur = excluded.valeur;

-- ---------- 2) Restitution de caution (ne touche pas le chiffre d'affaires) ----------
alter type type_paiement add value if not exists 'restitution_caution';

-- ---------- 3) Numéro de reçu (séquentiel, unique) ----------
create sequence if not exists recu_seq;
alter table paiements add column if not exists numero_recu bigint;

-- Numérote les paiements déjà enregistrés, dans l'ordre chronologique
update paiements p set numero_recu = n.num
from (select id, row_number() over (order by created_at) as num from paiements) n
where p.id = n.id and p.numero_recu is null;

select setval('recu_seq', coalesce((select max(numero_recu) from paiements), 0) + 1, false);
alter table paiements alter column numero_recu set default nextval('recu_seq');
alter table paiements alter column numero_recu set not null;
create unique index if not exists paiements_numero_recu_idx on paiements (numero_recu);
create index if not exists paiements_date_idx on paiements (created_at);

-- ---------- 4) Clôtures de caisse ----------
create table if not exists clotures_caisse (
  id                uuid primary key default gen_random_uuid(),
  jour              date not null unique,
  especes_attendues int  not null,                       -- calculé : entrées - sorties en espèces
  especes_comptees  int  not null check (especes_comptees >= 0),
  ecart             int  generated always as (especes_comptees - especes_attendues) stored,
  total_encaisse    int  not null default 0,             -- chiffre d'affaires du jour (hors cautions)
  details           jsonb not null default '{}',         -- { mode: { entrees, sorties } }
  notes             text,
  cloture_par       uuid references profiles(id),
  created_at        timestamptz not null default now()
);

alter table clotures_caisse enable row level security;

drop policy if exists "clôtures: lecture" on clotures_caisse;
drop policy if exists "clôtures: création" on clotures_caisse;
drop policy if exists "clôtures: réouverture admin" on clotures_caisse;
create policy "clôtures: lecture"  on clotures_caisse for select
  using (est_staff(array['admin','gerant','receptionniste','comptable']::role_staff[]));
create policy "clôtures: création" on clotures_caisse for insert
  with check (est_staff(array['admin','gerant','receptionniste','comptable']::role_staff[]));
create policy "clôtures: réouverture admin" on clotures_caisse for delete
  using (est_staff(array['admin']::role_staff[]));

-- ---------- 5) Journée clôturée = plus aucun paiement (sauf paiement en ligne PayDunya) ----------
create or replace function verifier_caisse_ouverte() returns trigger
language plpgsql set search_path = public as $$
declare v_jour date := (coalesce(new.created_at, now()) at time zone 'Africa/Dakar')::date;
begin
  if new.mode::text <> 'paydunya' and exists (select 1 from clotures_caisse where jour = v_jour) then
    raise exception 'La caisse du % est clôturée : aucun paiement ne peut y être ajouté.', to_char(v_jour, 'DD/MM/YYYY');
  end if;
  return new;
end $$;

drop trigger if exists trg_caisse_ouverte on paiements;
create trigger trg_caisse_ouverte before insert on paiements
  for each row execute function verifier_caisse_ouverte();

-- ---------- 6) Clôturer une journée ----------
-- (les types sont comparés en texte : la nouvelle valeur d'enum n'est utilisable qu'après cette migration)
create or replace function cloturer_caisse(p_jour date, p_especes_comptees int, p_notes text default null)
returns clotures_caisse language plpgsql security invoker set search_path = public as $$
declare v clotures_caisse%rowtype; v_details jsonb; v_attendu int; v_total int;
begin
  if not est_staff(array['admin','gerant','receptionniste','comptable']::role_staff[]) then
    raise exception 'Vous n''avez pas les droits pour clôturer la caisse.';
  end if;
  if p_jour > (now() at time zone 'Africa/Dakar')::date then raise exception 'Impossible de clôturer un jour à venir.'; end if;
  if p_especes_comptees is null or p_especes_comptees < 0 then raise exception 'Montant compté invalide.'; end if;
  if exists (select 1 from clotures_caisse where jour = p_jour) then raise exception 'Cette journée est déjà clôturée.'; end if;

  select coalesce(jsonb_object_agg(mode, jsonb_build_object('entrees', entrees, 'sorties', sorties)), '{}'::jsonb)
  into v_details
  from (
    select mode::text as mode,
           coalesce(sum(montant) filter (where type::text in ('acompte','solde','extra','caution')), 0) as entrees,
           coalesce(sum(montant) filter (where type::text in ('remboursement','restitution_caution')), 0) as sorties
    from paiements
    where (created_at at time zone 'Africa/Dakar')::date = p_jour
    group by mode
  ) t;

  select coalesce(sum(case when type::text in ('remboursement','restitution_caution') then -montant else montant end), 0)
  into v_attendu
  from paiements
  where (created_at at time zone 'Africa/Dakar')::date = p_jour and mode::text = 'especes';

  select coalesce(sum(case when type::text = 'remboursement' then -montant else montant end), 0)
  into v_total
  from paiements
  where (created_at at time zone 'Africa/Dakar')::date = p_jour and type::text in ('acompte','solde','extra','remboursement');

  insert into clotures_caisse (jour, especes_attendues, especes_comptees, total_encaisse, details, notes, cloture_par)
  values (p_jour, v_attendu, p_especes_comptees, v_total, v_details, nullif(trim(p_notes), ''), auth.uid())
  returning * into v;

  insert into journal_activite (user_id, action, cible_table, cible_id, details)
  values (auth.uid(), 'caisse.cloturee', 'clotures_caisse', v.id,
          jsonb_build_object('jour', p_jour, 'attendu', v_attendu, 'compte', p_especes_comptees, 'ecart', v.ecart));
  return v;
end $$;

revoke execute on function cloturer_caisse(date, int, text) from public, anon;
grant  execute on function cloturer_caisse(date, int, text) to authenticated;

-- Vérification : vos paiements avec leur numéro de reçu, et les nouveaux paramètres
select numero_recu, type, mode, montant, created_at from paiements order by numero_recu;
