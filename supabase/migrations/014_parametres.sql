-- =====================================================================
--  014 — Paramètres : catégories de dépenses (renommer / supprimer), journal
--  À exécuter dans : Supabase > SQL Editor > New query
-- =====================================================================

-- Suppression d'une catégorie de dépense (admin) : seulement si aucune dépense ne l'utilise
-- (sinon : la masquer avec « actif = false »)
drop policy if exists "catégories dépenses: suppression admin" on categories_depenses;
create policy "catégories dépenses: suppression admin" on categories_depenses for delete
  using (est_staff(array['admin']::role_staff[])
         and not exists (select 1 from depenses d where d.categorie = categories_depenses.nom));

-- Renommer une catégorie de dépense : met aussi à jour les dépenses déjà saisies
create or replace function renommer_categorie_depense(p_ancien text, p_nouveau text)
returns void language plpgsql security definer set search_path = public as $$
declare c categories_depenses%rowtype; v_nouveau text := trim(p_nouveau);
begin
  if not est_staff(array['admin']::role_staff[]) then raise exception 'Réservé à l''administrateur.'; end if;
  if coalesce(v_nouveau, '') = '' then raise exception 'Le nouveau nom est obligatoire.'; end if;
  select * into c from categories_depenses where nom = p_ancien;
  if not found then raise exception 'Catégorie introuvable.'; end if;
  if v_nouveau = p_ancien then return; end if;
  if exists (select 1 from categories_depenses where nom = v_nouveau) then
    raise exception 'La catégorie « % » existe déjà.', v_nouveau;
  end if;

  insert into categories_depenses (nom, ordre, actif) values (v_nouveau, c.ordre, c.actif);
  update depenses set categorie = v_nouveau where categorie = p_ancien;
  delete from categories_depenses where nom = p_ancien;

  insert into journal_activite (user_id, action, cible_table, details)
  values (auth.uid(), 'parametres.categorie_depense', 'categories_depenses',
          jsonb_build_object('ancien', p_ancien, 'nouveau', v_nouveau));
end $$;

revoke execute on function renommer_categorie_depense(text, text) from public, anon;
grant  execute on function renommer_categorie_depense(text, text) to authenticated;

-- Journal : affichage du plus récent au plus ancien, filtre par module
create index if not exists journal_date_idx on journal_activite (created_at desc);
create index if not exists journal_action_idx on journal_activite (action);

-- Vérification : les paramètres actuels
select cle, valeur from parametres order by cle;
