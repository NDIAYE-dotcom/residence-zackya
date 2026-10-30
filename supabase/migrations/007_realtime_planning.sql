-- =====================================================================
--  007 — Temps réel pour le planning (Supabase Realtime)
--  À exécuter dans : Supabase > SQL Editor > New query
--
--  Les changements sur les réservations et les studios sont diffusés aux
--  écrans ouverts (le planning se met à jour tout seul).
--  Les règles RLS s'appliquent : chacun ne reçoit que ce qu'il a le droit de lire.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reservations') then
    alter publication supabase_realtime add table reservations;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'studios') then
    alter publication supabase_realtime add table studios;
  end if;
end $$;

-- Vérification : doit lister « reservations » et « studios »
select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename;
