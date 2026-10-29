import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../../components/Toast/Toast.jsx';
import BrouillonRestaure from '../../../components/BrouillonRestaure/BrouillonRestaure.jsx';
import { useBrouillon } from '../../../hooks/useBrouillon.js';
import { lireParametres } from '../../../services/parametres.js';
import { creerReservation } from '../../../services/reservations.js';
import { creerClient, trouverParTelephone } from '../../../services/clients.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, FORMULES } from '../../../lib/format.js';
import { calculerFin, debutParDefaut, formatDuree, formatJourHeure, versChampDate } from '../../../lib/dates.js';
import { normaliserTelephoneClient } from '../../../lib/telephone.js';
import EtapeDates from './EtapeDates.jsx';
import EtapeStudio from './EtapeStudio.jsx';
import EtapeClient from './EtapeClient.jsx';
import './NouvelleReservation.css';

const ETAPES = ['Formule & dates', 'Studio & prix', 'Client & paiement'];

const DETAILS_INITIAUX = {
  nbPersonnes: 1, source: 'sur_place', confirmer: true,
  remise: '', caution: '', acompte: '', mode: 'especes', referenceTransaction: '', notes: '',
  listeNoireAcceptee: false,
};

// Tout ce que l'employé a saisi (gardé en brouillon jusqu'à la création)
const SAISIE_INITIALE = {
  etape: 1,
  sejour: null, // { formule, debut, fin, quantite } — null = séjour proposé par défaut
  studio: null,
  client: null, // client existant
  modeClient: 'existant', // 'existant' | 'nouveau'
  nouveauClient: { full_name: '', phone: '', nationalite: 'Sénégalaise' },
  details: DETAILS_INITIAUX,
};

const entier = (v) => (v === '' || v == null ? 0 : Number(v));

/**
 * Nouvelle réservation en 3 étapes :
 * 1. formule + dates (raccourcis selon la formule)  2. studio libre + prix  3. client + acompte
 */
export default function NouvelleReservation() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useState(null);
  const [sejourParDefaut, setSejourParDefaut] = useState(null);
  const [saisie, setSaisie, brouillon] = useBrouillon('nouvelle-reservation', SAISIE_INITIALE);
  const [envoi, setEnvoi] = useState(false);

  const { etape, studio, client, modeClient, nouveauClient, details } = saisie;
  const sejour = saisie.sejour ?? sejourParDefaut;

  // Setter d'un champ de la saisie (accepte une valeur ou une fonction, comme useState)
  const champ = (nom) => (v) => setSaisie((s) => ({ ...s, [nom]: typeof v === 'function' ? v(s[nom]) : v }));
  const setEtape = champ('etape');
  const setStudio = champ('studio');
  const setClient = champ('client');
  const setModeClient = champ('modeClient');
  const setNouveauClient = champ('nouveauClient');
  const setDetails = champ('details');

  // Paramètres (horaires de nuitée, check-in/out, % d'acompte) puis séjour proposé
  useEffect(() => {
    const demarrer = (p) => {
      setParams(p);
      const debut = debutParDefaut('nuitee', p);
      setSejourParDefaut({ formule: 'nuitee', quantite: 1, debut: versChampDate(debut), fin: versChampDate(calculerFin('nuitee', debut, 1, p)) });
    };
    lireParametres().then(demarrer).catch(() => demarrer({}));
  }, []);

  // Changer les dates annule le studio choisi (sa disponibilité n'est plus garantie)
  const changerSejour = (s) => setSaisie((x) => ({ ...x, sejour: s, studio: null }));

  const montant = studio?.prix ?? 0;
  const remise = entier(details.remise);
  const net = Math.max(0, montant - remise);
  const acompte = entier(details.acompte);

  // Contrôles avant l'envoi (message d'erreur ou null)
  const probleme = () => {
    if (modeClient === 'existant' && !client) return 'Choisissez un client ou créez-en un nouveau.';
    if (modeClient === 'nouveau') {
      if (!nouveauClient.full_name.trim()) return 'Indiquez le nom du client.';
      if (!normaliserTelephoneClient(nouveauClient.phone)) return 'Téléphone du client invalide.';
    }
    if (client?.liste_noire && !details.listeNoireAcceptee) return 'Ce client est en liste noire : cochez la case pour confirmer.';
    for (const [champ, libelle] of [['remise', 'La remise'], ['caution', 'La caution'], ['acompte', 'L’acompte']]) {
      const v = details[champ];
      if (v !== '' && (!Number.isInteger(Number(v)) || Number(v) < 0)) return `${libelle} doit être un nombre entier positif.`;
    }
    if (!Number.isInteger(Number(details.nbPersonnes)) || Number(details.nbPersonnes) < 1) return 'Nombre de personnes invalide.';
    if (remise > montant) return 'La remise dépasse le montant.';
    if (acompte > net) return 'L’acompte dépasse le montant à payer.';
    return null;
  };

  const valider = async () => {
    const message = probleme();
    if (message) return toast.erreur(message);
    setEnvoi(true);
    try {
      // Client : existant, ou créé maintenant (réutilisé si le numéro est déjà connu)
      let clientId = client?.id;
      if (!clientId) {
        const phone = normaliserTelephoneClient(nouveauClient.phone);
        const existant = await trouverParTelephone(phone);
        if (existant) {
          clientId = existant.id;
          toast.succes(`Numéro déjà connu : réservation au nom de ${existant.full_name}.`);
        } else {
          clientId = (await creerClient({
            full_name: nouveauClient.full_name.trim(), phone, nationalite: nouveauClient.nationalite.trim() || null,
          })).id;
        }
      }

      const res = await creerReservation({
        studioId: studio.studio_id, clientId, formule: sejour.formule, debut: sejour.debut, fin: sejour.fin,
        nbPersonnes: Number(details.nbPersonnes), source: details.source,
        statut: details.confirmer ? 'confirmee' : 'en_attente',
        remise, caution: entier(details.caution), notes: details.notes,
        acompte, mode: details.mode, referenceTransaction: details.referenceTransaction,
      });
      brouillon.marquerEnregistre();
      toast.succes(`Réservation ${res.reference} créée.`);
      navigate('/admin/reservations', { state: { nouvelle: res.reference } });
    } catch (err) {
      toast.erreur(messageErreur(err));
      if (err.code === '23P01') setSaisie((s) => ({ ...s, studio: null, etape: 2 })); // créneau pris entre-temps
    } finally {
      setEnvoi(false);
    }
  };

  if (!sejour) return <div className="nresa__etat">Préparation…</div>;

  return (
    <div className="nresa">
      <Link to="/admin/reservations" className="nresa__retour">← Réservations</Link>
      <h1>Nouvelle réservation</h1>
      <BrouillonRestaure visible={brouillon.restaure} onEffacer={brouillon.abandonner} libelle="Recommencer à zéro" />

      <ol className="nresa__etapes">
        {ETAPES.map((libelle, i) => (
          <li key={libelle} className={`${etape === i + 1 ? 'nresa__etape--active' : ''} ${etape > i + 1 ? 'nresa__etape--faite' : ''}`}>
            <span>{etape > i + 1 ? '✓' : i + 1}</span>{libelle}
          </li>
        ))}
      </ol>

      <div className="nresa__corps">
        <section className="nresa__panneau">
          {etape === 1 && (
            <EtapeDates sejour={sejour} params={params} onChange={changerSejour} onSuivant={() => setEtape(2)} />
          )}
          {etape === 2 && (
            <EtapeStudio sejour={sejour} choisi={studio} onChoisir={setStudio}
              onRetour={() => setEtape(1)} onSuivant={() => setEtape(3)} />
          )}
          {etape === 3 && (
            <EtapeClient
              studio={studio} params={params} net={net}
              client={client} setClient={setClient}
              modeClient={modeClient} setModeClient={setModeClient}
              nouveauClient={nouveauClient} setNouveauClient={setNouveauClient}
              details={details} setDetails={setDetails}
              envoi={envoi} onRetour={() => setEtape(2)} onValider={valider}
            />
          )}
        </section>

        <aside className="nresa__recap" aria-label="Récapitulatif">
          <h2>Récapitulatif</h2>
          <dl>
            <dt>Formule</dt><dd>{FORMULES[sejour.formule]}</dd>
            <dt>Arrivée</dt><dd>{sejour.debut ? formatJourHeure(sejour.debut) : '—'}</dd>
            <dt>Départ</dt><dd>{sejour.fin ? formatJourHeure(sejour.fin) : '—'}</dd>
            {sejour.debut && sejour.fin && new Date(sejour.fin) > new Date(sejour.debut) && (
              <><dt>Durée</dt><dd>{formatDuree(sejour.debut, sejour.fin)}</dd></>
            )}
            <dt>Studio</dt><dd>{studio ? `${studio.code} – ${studio.nom}` : '—'}</dd>
            <dt>Client</dt><dd>{client?.full_name || (modeClient === 'nouveau' && nouveauClient.full_name.trim()) || '—'}</dd>
          </dl>
          {studio && (
            <div className="nresa__totaux">
              <div><span>Prix du séjour</span><strong>{formatFCFA(montant)}</strong></div>
              {remise > 0 && <div><span>Remise</span><strong>− {formatFCFA(remise)}</strong></div>}
              <div className="nresa__total"><span>À payer</span><strong>{formatFCFA(net)}</strong></div>
              {acompte > 0 && <div><span>Acompte versé</span><strong>− {formatFCFA(acompte)}</strong></div>}
              {acompte > 0 && <div className="nresa__reste"><span>Reste à payer</span><strong>{formatFCFA(Math.max(0, net - acompte))}</strong></div>}
              {entier(details.caution) > 0 && <div className="nresa__caution"><span>Caution (à part)</span><strong>{formatFCFA(entier(details.caution))}</strong></div>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
