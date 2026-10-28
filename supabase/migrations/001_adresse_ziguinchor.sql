-- =====================================================================
--  001 — La résidence est à Ziguinchor (et non à Dakar)
--  À exécuter dans : Supabase > SQL Editor > New query
-- =====================================================================

update parametres set valeur = 'Ziguinchor, Sénégal' where cle = 'adresse'
returning cle, valeur;
