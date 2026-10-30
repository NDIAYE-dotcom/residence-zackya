// Fonctions utilitaires d'affichage — réutilisées partout dans l'app

export const formatFCFA = (montant) =>
  new Intl.NumberFormat('fr-FR').format(montant ?? 0) + ' FCFA';

// Une date seule « AAAA-MM-JJ » est lue en heure locale (sinon elle peut s'afficher la veille)
const lireDate = (d) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T00:00:00`) : new Date(d));

export const formatDate = (d) =>
  lireDate(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

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

// Pièces d'identité acceptées à l'enregistrement
export const PIECES_IDENTITE = ['CNI', 'Passeport', 'Carte CEDEAO', 'Permis de conduire', 'Carte de séjour', 'Autre'];

// Suggestions de nationalités (saisie libre possible)
export const NATIONALITES = [
  'Sénégalaise', 'Gambienne', 'Bissau-guinéenne', 'Guinéenne', 'Malienne', 'Mauritanienne',
  'Ivoirienne', 'Capverdienne', 'Française', 'Belge', 'Espagnole', 'Italienne', 'Américaine',
];

// Unités au pluriel (« 3 nuits »)
export const UNITES_FORMULE_PLURIEL = {
  heure: 'heures',
  demi_journee: 'demi-journées',
  journee: 'journées',
  nuitee: 'nuits',
  semaine: 'semaines',
  mois: 'mois',
};

export const SOURCES_RESERVATION = {
  sur_place: 'Sur place',
  telephone: 'Téléphone',
  whatsapp: 'WhatsApp',
  site: 'Site web',
  partenaire: 'Partenaire',
};

export const TYPES_PAIEMENT = {
  acompte: 'Acompte',
  solde: 'Solde',
  extra: 'Extra (service en plus)',
  caution: 'Caution',
  remboursement: 'Remboursement',
  restitution_caution: 'Restitution de caution',
};

// Sens des mouvements de caisse
export const TYPES_ENTREE = ['acompte', 'solde', 'extra', 'caution'];
export const TYPES_SORTIE = ['remboursement', 'restitution_caution'];
// Chiffre d'affaires : hors cautions (une caution est rendue)
export const signeCA = (type) => (type === 'remboursement' ? -1 : ['acompte', 'solde', 'extra'].includes(type) ? 1 : 0);

// Libellés de l'historique (journal_activite.action)
export const ACTIONS_JOURNAL = {
  'reservation.creee': 'Réservation créée',
  'reservation.confirmee': 'Réservation confirmée',
  'reservation.en_cours': 'Check-in',
  'reservation.terminee': 'Check-out',
  'reservation.annulee': 'Réservation annulée',
  'reservation.no_show': 'Client non présenté',
  'reservation.prolongee': 'Départ modifié',
  'reservation.studio_change': 'Changement de studio',
  'paiement.ajoute': 'Paiement enregistré',
  'caisse.cloturee': 'Caisse clôturée',
  'caisse.rouverte': 'Caisse rouverte',
  'client.cree': 'Client créé',
  'client.modifie': 'Client modifié',
  'client.liste_noire': 'Client mis en liste noire',
  'client.liste_noire_retire': 'Client retiré de la liste noire',
  'studio.cree': 'Studio créé',
  'studio.modifie': 'Studio modifié',
  'studio.supprime': 'Studio supprimé',
  'studio.statut': 'Statut d’un studio changé',
  'studio.publication': 'Publication d’un studio changée',
  'studio.photos': 'Photos d’un studio modifiées',
  'tarifs.modifies': 'Tarifs modifiés',
  'personnel.cree': 'Employé créé',
  'personnel.modifie': 'Employé modifié',
  'personnel.role': 'Rôle d’un employé changé',
  'personnel.active': 'Compte activé',
  'personnel.desactive': 'Compte désactivé',
  'personnel.mot_de_passe': 'Mot de passe changé',
  'depense.creee': 'Dépense saisie',
  'depense.modifiee': 'Dépense modifiée',
  'depense.supprimee': 'Dépense supprimée',
  'menage.creee': 'Tâche de ménage ajoutée',
  'menage.commencee': 'Ménage commencé',
  'menage.terminee': 'Ménage terminé',
  'menage.assignee': 'Tâche de ménage assignée',
  'menage.supprimee': 'Tâche de ménage supprimée',
  'maintenance.signalee': 'Panne signalée',
  'maintenance.en_cours': 'Panne prise en charge',
  'maintenance.priorite': 'Priorité d’une panne changée',
  'maintenance.resolue': 'Panne résolue',
  'maintenance.supprimee': 'Panne supprimée',
  'parametres.modifies': 'Paramètres modifiés',
  'parametres.categorie_studio': 'Catégorie de studio enregistrée',
  'parametres.categorie_studio_supprimee': 'Catégorie de studio supprimée',
  'parametres.categorie_depense': 'Catégorie de dépense renommée',
};

// Modules du journal (préfixe de l'action)
export const MODULES_JOURNAL = {
  reservation: 'Réservations', paiement: 'Paiements', caisse: 'Caisse', client: 'Clients', studio: 'Studios',
  tarifs: 'Tarifs', personnel: 'Personnel', depense: 'Dépenses', menage: 'Ménage', maintenance: 'Maintenance', parametres: 'Paramètres',
};

export const PRIORITES = { urgente: 'Urgente', haute: 'Haute', normale: 'Normale', basse: 'Basse' };
export const STATUTS_TACHE = { a_faire: 'À faire', en_cours: 'En cours', terminee: 'Résolue' };
export const ETATS_INVENTAIRE = { bon: 'Bon état', use: 'Usé', a_remplacer: 'À remplacer' };
