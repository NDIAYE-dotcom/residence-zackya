// Fonctions utilitaires d'affichage — réutilisées partout dans l'app

export const formatFCFA = (montant) =>
  new Intl.NumberFormat('fr-FR').format(montant ?? 0) + ' FCFA';

export const formatDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatDateHeure = (d) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const FORMULES = {
  heure: 'À l’heure',
  demi_journee: 'Demi-journée',
  journee: 'Journée',
  nuitee: 'Nuitée',
  semaine: 'Semaine',
  mois: 'Mois',
};

export const STATUTS_RESERVATION = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
  no_show: 'Non présenté',
};

export const STATUTS_STUDIO = {
  disponible: 'Disponible',
  occupe: 'Occupé',
  nettoyage: 'Nettoyage',
  maintenance: 'Maintenance',
  hors_service: 'Hors service',
};

export const MODES_PAIEMENT = {
  especes: 'Espèces',
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  carte: 'Carte bancaire',
  virement: 'Virement',
  paydunya: 'PayDunya (en ligne)',
};
