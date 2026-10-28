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

// Durée d'une unité de chaque formule (colonne tarifs.duree_heures)
export const DUREES_FORMULE = {
  heure: 1,
  demi_journee: 6,
  journee: 12,
  nuitee: 18,
  semaine: 168,
  mois: 720,
};

// Unité facturée, pour « 25 000 FCFA / nuit »
export const UNITES_FORMULE = {
  heure: 'heure',
  demi_journee: 'demi-journée',
  journee: 'journée',
  nuitee: 'nuit',
  semaine: 'semaine',
  mois: 'mois',
};

// Rôles du personnel (type role_staff)
export const ROLES_STAFF = {
  admin: 'Administrateur',
  gerant: 'Gérant',
  receptionniste: 'Réception',
  menage: 'Ménage',
  comptable: 'Comptable',
};

// Ce que chaque rôle peut faire (aide au choix du rôle)
export const DESCRIPTIONS_ROLES = {
  admin: 'Accès complet, gère le personnel et les paramètres.',
  gerant: 'Tout sauf le personnel et les paramètres.',
  receptionniste: 'Réservations, clients, caisse, planning.',
  menage: 'Ménage, maintenance et planning.',
  comptable: 'Caisse, dépenses, rapports (réservations en lecture).',
};
