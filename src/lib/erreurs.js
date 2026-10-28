// Traduit les erreurs Supabase / Postgres / Storage en messages français
export const messageErreur = (err, defaut = 'Une erreur est survenue. Réessayez.') => {
  if (!err) return defaut;
  const msg = err.message ?? String(err);

  switch (err.code) {
    case '23P01': return 'Ce studio est déjà réservé sur cette période.';
    case '23505': return 'Cette valeur existe déjà (doublon).';
    case '23503': return 'Impossible : cet élément est lié à d’autres données.';
    case '42501': return 'Vous n’avez pas les droits pour cette action.';
    case 'P0001': return msg; // exceptions levées par nos fonctions SQL (déjà en français)
    case 'FONCTION': return msg; // message déjà traduit par une Edge Function
    case 'FORMAT_PHOTO': return 'Format de photo non supporté (utilisez JPG, PNG ou WEBP).';
    default: break;
  }

  if (msg.includes('Failed to fetch')) return 'Connexion impossible. Vérifiez votre internet.';
  if (msg.includes('row-level security')) return 'Vous n’avez pas les droits pour cette action.';
  if (msg.includes('maximum allowed size')) return 'Photo trop lourde (5 Mo maximum).';
  if (msg.includes('mime type')) return 'Format de photo non supporté (utilisez JPG, PNG ou WEBP).';
  if (msg.includes('Bucket not found')) return 'Stockage des photos non configuré (migration 002).';
  return defaut;
};
