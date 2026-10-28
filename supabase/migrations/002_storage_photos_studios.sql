-- =====================================================================
--  002 — Stockage des photos des studios (Supabase Storage)
--  À exécuter dans : Supabase > SQL Editor > New query
--
--  Bucket PUBLIC « studios » : les photos s'affichent sur le site sans connexion.
--  Seuls l'admin et le gérant peuvent ajouter / remplacer / supprimer des photos.
--  Limite : 5 Mo par fichier, formats JPG / PNG / WEBP.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studios', 'studios', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lecture via l'API (nécessaire pour supprimer) : admin / gérant.
-- L'affichage public passe par l'URL publique, sans policy.
create policy "photos studios: lecture gestion" on storage.objects
  for select to authenticated
  using (bucket_id = 'studios' and public.est_staff(array['admin','gerant']::public.role_staff[]));

create policy "photos studios: ajout" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'studios' and public.est_staff(array['admin','gerant']::public.role_staff[]));

create policy "photos studios: modification" on storage.objects
  for update to authenticated
  using (bucket_id = 'studios' and public.est_staff(array['admin','gerant']::public.role_staff[]));

create policy "photos studios: suppression" on storage.objects
  for delete to authenticated
  using (bucket_id = 'studios' and public.est_staff(array['admin','gerant']::public.role_staff[]));
