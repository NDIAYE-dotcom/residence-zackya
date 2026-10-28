-- =====================================================================
--  003 — Personnel : email dans les profils + protection du dernier admin
--  À exécuter dans : Supabase > SQL Editor > New query
-- =====================================================================

-- 1) Email visible dans la liste du personnel (auth.users n'est pas lisible depuis l'application)
alter table profiles add column if not exists email text;

update profiles p set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- Le profil créé automatiquement reprend désormais l'email
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, phone, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'phone', new.email);
  return new;
end $$;

-- 2) Il doit toujours rester au moins un administrateur actif
create or replace function proteger_dernier_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and old.actif
     and (new.role <> 'admin' or not new.actif)
     and not exists (select 1 from profiles where role = 'admin' and actif and id <> old.id) then
    raise exception 'Impossible : il doit rester au moins un administrateur actif.';
  end if;
  return new;
end $$;

drop trigger if exists trg_proteger_dernier_admin on profiles;
create trigger trg_proteger_dernier_admin
  before update of role, actif on profiles
  for each row execute function proteger_dernier_admin();

-- Vérification : votre compte doit apparaître avec son email
select full_name, email, role, actif from profiles order by created_at;
