-- =====================================================================
--  024 — Factures et devis de SUDSOUDURE ENTREPRISE (autre société du propriétaire)
--
--  Totalement séparé de la comptabilité de Zaquia Résidence :
--  aucune caisse, aucun rapport, aucun lien avec les réservations.
--  Accès : administrateur uniquement.
--  La base calcule les totaux et attribue les numéros (FAC-2026-001, DEV-2026-001…).
-- =====================================================================

create table if not exists sud_documents (
  id              uuid primary key default gen_random_uuid(),
  type            text not null check (type in ('facture', 'devis')),
  numero          text unique,
  date_document   date not null default ((now() at time zone 'Africa/Dakar')::date),
  client_nom      text not null check (length(trim(client_nom)) between 2 and 120),
  client_telephone text,
  client_adresse  text,
  objet           text,
  lignes          jsonb not null default '[]'::jsonb,  -- [{ designation, quantite, unite, prix_unitaire }]
  remise          bigint not null default 0 check (remise >= 0),
  tva             boolean not null default false,       -- TVA 18 %
  total_ht        bigint not null default 0,
  total_ttc       bigint not null default 0,
  notes           text,
  tampon          boolean not null default true,        -- tampon + signature sur le PDF
  created_by      uuid references profiles(id) default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists sud_documents_date on sud_documents (date_document desc);

-- Contrôles, totaux et numéro
create or replace function sud_document_avant() returns trigger
language plpgsql set search_path = public as $$
declare v_brut bigint; v_suivant int; v_prefixe text;
begin
  if jsonb_typeof(new.lignes) <> 'array' or jsonb_array_length(new.lignes) = 0 then
    raise exception 'Ajoutez au moins une ligne.';
  end if;
  if exists (select 1 from jsonb_array_elements(new.lignes) l
             where coalesce(trim(l->>'designation'), '') = ''
                or coalesce((l->>'quantite')::numeric, 0) <= 0
                or coalesce((l->>'prix_unitaire')::numeric, -1) < 0) then
    raise exception 'Chaque ligne doit avoir une désignation, une quantité et un prix.';
  end if;

  select coalesce(sum(round((l->>'quantite')::numeric * (l->>'prix_unitaire')::numeric)), 0)::bigint
  into v_brut from jsonb_array_elements(new.lignes) l;
  if new.remise > v_brut then raise exception 'La remise dépasse le total.'; end if;
  new.total_ht  := v_brut - new.remise;
  new.total_ttc := new.total_ht + case when new.tva then round(new.total_ht * 0.18)::bigint else 0 end;

  if tg_op = 'UPDATE' then
    if new.type <> old.type then raise exception 'Le type ne peut pas changer : dupliquez le document.'; end if;
    new.numero := old.numero;
    new.updated_at := now();
  elsif new.numero is null then
    -- Numéro suivant de l'année, sans doublon même si deux documents sont créés en même temps
    perform pg_advisory_xact_lock(hashtext('sud_documents_numero'));
    v_prefixe := case new.type when 'facture' then 'FAC' else 'DEV' end || '-' || to_char(new.date_document, 'YYYY') || '-';
    select coalesce(max(substring(numero from length(v_prefixe) + 1)::int), 0) + 1 into v_suivant
    from sud_documents where numero like v_prefixe || '%';
    new.numero := v_prefixe || lpad(v_suivant::text, 3, '0');
  end if;
  return new;
end $$;

drop trigger if exists trg_sud_document_avant on sud_documents;
create trigger trg_sud_document_avant before insert or update on sud_documents
  for each row execute function sud_document_avant();

-- Sécurité : administrateur uniquement
alter table sud_documents enable row level security;
drop policy if exists "sud: admin" on sud_documents;
create policy "sud: admin" on sud_documents for all
  using (est_staff(array['admin']::role_staff[])) with check (est_staff(array['admin']::role_staff[]));

-- Coordonnées de l'entreprise (modifiables depuis le module)
insert into parametres (cle, valeur) values
  ('sud_nom',        'SUDSOUDURE ENTREPRISE'),
  ('sud_activite',   'Entreprise de bâtiment · Bâtiment & Décoration'),
  ('sud_gerant',     'Samir KADRA'),
  ('sud_telephones', '77 656 68 04 · 70 607 70 70'),
  ('sud_adresse',    'Ziguinchor, Sénégal'),
  ('sud_email',      ''),
  ('sud_ninea',      ''),
  ('sud_rccm',       ''),
  ('sud_conditions', 'Paiement à la livraison des travaux.')
on conflict (cle) do nothing;

-- Vérification : doit afficher 1 table et 9 coordonnées
select (select count(*) from information_schema.tables where table_name = 'sud_documents') as table_creee,
       (select count(*) from parametres where cle like 'sud\_%') as coordonnees;
