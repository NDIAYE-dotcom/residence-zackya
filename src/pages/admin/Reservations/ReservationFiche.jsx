import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import Confirm from '../../../components/Confirm/Confirm.jsx';
import { lireReservation, historiqueReservation, changerStatut } from '../../../services/reservations.js';
import { paiementsReservation } from '../../../services/paiements.js';
import { lireClient } from '../../../services/clients.js';
import { notifierClient } from '../../../services/notifications.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { imprimerRecu } from '../../../lib/recu.js';
import {
  formatFCFA, formatDateHeure, FORMULES, STATUTS_RESERVATION, SOURCES_RESERVATION,
  MODES_PAIEMENT, TYPES_PAIEMENT, TYPES_SORTIE, ACTIONS_JOURNAL,
} from '../../../lib/format.js';
import { formatDuree, formatJourHeure } from '../../../lib/dates.js';
import { formatTelephone, lienWhatsApp } from '../../../lib/telephone.js';
import CheckinModal from './CheckinModal.jsx';
import ProlongerModal from './ProlongerModal.jsx';
import ChangerStudioModal from './ChangerStudioModal.jsx';
import PaiementModal from './PaiementModal.jsx';
import './ReservationFiche.css';

const ACTIVES = ['en_attente', 'confirmee', 'en_cours'];
const ETATS_ENVOI = { envoye: 'envoyé', sans_email: 'pas d’email', non_configure: 'non configuré', erreur: 'échec' };

// Détail lisible d'une ligne d'historique
const detailHistorique = (h) => {
  const d = h.details ?? {};
  if (h.action === 'paiement.ajoute') return `${TYPES_PAIEMENT[d.type] ?? d.type} · ${formatFCFA(d.montant)} · ${MODES_PAIEMENT[d.mode] ?? d.mode}`;
  if (h.action === 'reservation.prolongee') return `Départ : ${formatDateHeure(d.nouveau_depart)} · ${formatFCFA(d.nouveau_montant)}`;
  if (h.action === 'reservation.studio_change') return `${d.ancien_studio} → ${d.nouveau_studio} · ${formatFCFA(d.nouveau_montant)}`;
  if (h.action === 'reservation.creee' && d.acompte) return `Acompte ${formatFCFA(d.acompte)}`;
  if (h.action === 'reservation.creee' && d.source === 'site') return 'Réservée en ligne par le client';
  if (h.action === 'notification.confirmation') return `Email : ${ETATS_ENVOI[d.email] ?? d.email}`;
  return d.motif ? `Motif : ${d.motif}` : '';
};

// Fiche d'une réservation : informations, paiements, historique et actions du cycle de vie
export default function ReservationFiche() {
  const { id } = useParams();
  const { profile } = useAuth();
  const toast = useToast();
  const peutAgir = ['admin', 'gerant', 'receptionniste'].includes(profile?.role); // comptable : lecture seule

  const [resa, setResa] = useState(null);
  const [client, setClient] = useState(null);
  const [paiements, setPaiements] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [fenetre, setFenetre] = useState(null); // checkin | checkout | prolonger | studio | paiement | annulee | no_show
  const [motif, setMotif] = useState('');
  const [departSansSolde, setDepartSansSolde] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    setErreur('');
    try {
      const r = await lireReservation(id);
      setResa(r);
      if (r) {
        const [c, p, h] = await Promise.all([lireClient(r.client_id), paiementsReservation(id), historiqueReservation(id)]);
        setClient(c);
        setPaiements(p);
        setHistorique(h);
      }
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger la réservation.'));
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => { setChargement(true); charger(); }, [charger]);

  const fermer = () => { setFenetre(null); setMotif(''); setDepartSansSolde(false); };

  // Exécute une action, recharge la fiche, affiche le résultat
  const agir = async (fn, message) => {
    setEnCours(true);
    try {
      await fn();
      toast.succes(message);
      fermer();
      await charger();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  };

  const apresModale = (message) => { toast.succes(message); fermer(); charger(); };

  // Confirmer, puis prévenir le client (email ; WhatsApp Business plus tard) sans bloquer la réception
  const confirmer = async () => {
    setEnCours(true);
    try {
      await changerStatut(resa.id, 'confirmee');
      toast.succes('Réservation confirmée.');
      await charger();
      notifierClient(resa.id, 'confirmee')
        .then((r) => {
          if (r.email === 'envoye') toast.succes('Email de confirmation envoyé au client.');
          else if (r.email === 'erreur') toast.erreur('L’email de confirmation n’a pas pu être envoyé.');
          else if (r.email === 'sans_email') toast.succes('Le client n’a pas d’email : prévenez-le avec le bouton WhatsApp.');
          charger(); // l'envoi apparaît dans l'historique
        })
        .catch(() => { /* fonction non déployée ou non configurée : la confirmation reste valable */ });
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  };

  if (chargement) return <div className="rfiche__etat">Chargement de la réservation…</div>;
  if (erreur) {
    return (
      <div className="rfiche__etat rfiche__etat--erreur">
        <p>{erreur}</p>
        <button className="btn btn-contour" onClick={charger}>Réessayer</button>
      </div>
    );
  }
  if (!resa) {
    return (
      <div className="rfiche__etat">
        <p>Cette réservation n’existe pas.</p>
        <Link className="btn btn-contour" to="/admin/reservations">Retour aux réservations</Link>
      </div>
    );
  }

  const net = resa.montant_total - resa.remise;
  const actif = ACTIVES.includes(resa.statut);
  const close = ['annulee', 'no_show'].includes(resa.statut);
  // Caution détenue = versée − rendue
  const cautionVersee = paiements.reduce((t, p) => t + (p.type === 'caution' ? p.montant : p.type === 'restitution_caution' ? -p.montant : 0), 0);
  const cautionRendue = paiements.some((p) => p.type === 'restitution_caution');

  const imprimer = async (paiementId) => {
    try { await imprimerRecu(paiementId); } catch (err) { toast.erreur(messageErreur(err, 'Impossible de générer le reçu.')); }
  };

  const messageWhatsApp = [
    `Bonjour ${resa.client_nom},`,
    `Votre réservation ${resa.reference} à Zaquia Résidence est ${STATUTS_RESERVATION[resa.statut].toLowerCase()}.`,
    `Studio : ${resa.studio_nom} (${resa.studio_code}) · ${FORMULES[resa.formule]}`,
    `Arrivée : ${formatJourHeure(resa.date_debut)}`,
    `Départ : ${formatJourHeure(resa.date_fin)}`,
    `Montant : ${formatFCFA(net)}`,
    !close && (resa.reste_a_payer > 0 ? `Reste à payer : ${formatFCFA(resa.reste_a_payer)}` : 'Réservation soldée. Merci !'),
  ].filter(Boolean).join('\n');

  return (
    <div className="rfiche">
      <Link to="/admin/reservations" className="rfiche__retour">← Réservations</Link>

      <header className="rfiche__entete">
        <div>
          <div className="rfiche__titre">
            <h1>{resa.reference}</h1>
            <span className={`badge badge-${resa.statut}`}>{STATUTS_RESERVATION[resa.statut]}</span>
          </div>
          <p>{SOURCES_RESERVATION[resa.source]} · créée le {formatDateHeure(resa.created_at)}</p>
        </div>
        <a className="btn btn-contour" href={lienWhatsApp(resa.client_phone, messageWhatsApp)} target="_blank" rel="noreferrer">
          WhatsApp au client
        </a>
      </header>

      {/* ---------- Actions selon le statut ---------- */}
      {peutAgir && (
        <section className="rfiche__actions">
          {resa.statut === 'en_attente' && (
            <button className="btn btn-primaire" disabled={enCours} onClick={confirmer}>
              Confirmer
            </button>
          )}
          {['en_attente', 'confirmee'].includes(resa.statut) && (
            <button className="btn btn-rouge" onClick={() => setFenetre('checkin')}>Check-in</button>
          )}
          {resa.statut === 'en_cours' && (
            <button className="btn btn-rouge" onClick={() => setFenetre('checkout')}>Check-out</button>
          )}
          <button className="btn btn-contour" onClick={() => setFenetre('paiement')}>Encaisser</button>
          {actif && <button className="btn btn-contour" onClick={() => setFenetre('prolonger')}>Prolonger</button>}
          {actif && <button className="btn btn-contour" onClick={() => setFenetre('studio')}>Changer de studio</button>}
          {['en_attente', 'confirmee'].includes(resa.statut) && (
            <span className="rfiche__actions-fin">
              <button className="rfiche__lien-rouge" onClick={() => setFenetre('no_show')}>Non présenté</button>
              <button className="rfiche__lien-rouge" onClick={() => setFenetre('annulee')}>Annuler</button>
            </span>
          )}
        </section>
      )}

      {close && (
        <div className="rfiche__annulation">
          <strong>{resa.statut === 'annulee' ? 'Réservation annulée' : 'Client non présenté'}</strong>
          {resa.annulee_le && <span> le {formatDateHeure(resa.annulee_le)}</span>}
          <p>Motif : {resa.motif_annulation || '—'}</p>
        </div>
      )}

      <div className="rfiche__grille">
        {/* ---------- Séjour ---------- */}
        <section className="rfiche__carte">
          <h2>Séjour</h2>
          <dl className="rfiche__infos">
            <dt>Studio</dt><dd>{resa.studio_code} – {resa.studio_nom}</dd>
            <dt>Formule</dt><dd>{FORMULES[resa.formule]}</dd>
            <dt>Arrivée</dt><dd>{formatJourHeure(resa.date_debut)}</dd>
            <dt>Départ</dt><dd>{formatJourHeure(resa.date_fin)}</dd>
            <dt>Durée</dt><dd>{formatDuree(resa.date_debut, resa.date_fin)}</dd>
            <dt>Personnes</dt><dd>{resa.nb_personnes}</dd>
            {resa.checkin_at && (<><dt>Check-in</dt><dd>{formatDateHeure(resa.checkin_at)}</dd></>)}
            {resa.checkout_at && (<><dt>Check-out</dt><dd>{formatDateHeure(resa.checkout_at)}</dd></>)}
          </dl>
          {resa.notes && <p className="rfiche__notes">{resa.notes}</p>}
        </section>

        {/* ---------- Client ---------- */}
        <section className="rfiche__carte">
          <h2>Client</h2>
          <p className="rfiche__client">
            {peutAgir ? <Link to={`/admin/clients/${resa.client_id}`}>{resa.client_nom}</Link> : <strong>{resa.client_nom}</strong>}
            {client?.liste_noire && <span className="rfiche__noire">Liste noire</span>}
          </p>
          <dl className="rfiche__infos">
            <dt>Téléphone</dt><dd>{formatTelephone(resa.client_phone)}</dd>
            <dt>Nationalité</dt><dd>{client?.nationalite || '—'}</dd>
            <dt>Pièce</dt>
            <dd>{client?.piece_numero ? `${client.piece_type} · ${client.piece_numero}` : <span className="rfiche__manque">À demander au check-in</span>}</dd>
            <dt>Séjours</dt><dd>{client?.nb_sejours ?? 0} terminé(s)</dd>
          </dl>
        </section>

        {/* ---------- Montants & paiements ---------- */}
        <section className="rfiche__carte">
          <h2>Paiement</h2>
          <div className="rfiche__montants">
            <div><span>Prix du séjour</span><strong>{formatFCFA(resa.montant_total)}</strong></div>
            {resa.remise > 0 && <div><span>Remise</span><strong>− {formatFCFA(resa.remise)}</strong></div>}
            <div className="rfiche__net"><span>À payer</span><strong>{formatFCFA(net)}</strong></div>
            <div><span>Déjà payé</span><strong>{formatFCFA(resa.total_paye)}</strong></div>
            {!close && (
              <div className={resa.reste_a_payer > 0 ? 'rfiche__reste' : 'rfiche__solde'}>
                <span>{resa.reste_a_payer > 0 ? 'Reste à payer' : 'Soldé'}</span>
                <strong>{formatFCFA(Math.max(0, resa.reste_a_payer))}</strong>
              </div>
            )}
            {resa.caution > 0 && (
              <div className="rfiche__caution">
                <span>Caution prévue</span><strong>{formatFCFA(resa.caution)} {cautionVersee > 0 ? '(détenue)' : cautionRendue ? '(rendue)' : '(non versée)'}</strong>
              </div>
            )}
          </div>

          <h3>Paiements reçus</h3>
          {!paiements.length ? (
            <p className="rfiche__vide">Aucun paiement.</p>
          ) : (
            <ul className="rfiche__paiements">
              {paiements.map((p) => (
                <li key={p.id}>
                  <div>
                    <strong>{TYPES_PAIEMENT[p.type]}</strong>
                    <small>{MODES_PAIEMENT[p.mode]}{p.reference_transaction ? ` · n° ${p.reference_transaction}` : ''} · {formatDateHeure(p.created_at)}{p.recu?.full_name ? ` · ${p.recu.full_name}` : ''}</small>
                  </div>
                  <div className="rfiche__paiement-droite">
                    <strong className={TYPES_SORTIE.includes(p.type) ? 'rfiche__negatif' : ''}>
                      {TYPES_SORTIE.includes(p.type) ? '− ' : ''}{formatFCFA(p.montant)}
                    </strong>
                    {!TYPES_SORTIE.includes(p.type) && (
                      <button type="button" className="rfiche__recu" onClick={() => imprimer(p.id)}>Reçu n° {p.numero_recu}</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------- Historique ---------- */}
        <section className="rfiche__carte">
          <h2>Historique</h2>
          {!historique.length ? (
            <p className="rfiche__vide">Aucune action enregistrée.</p>
          ) : (
            <ol className="rfiche__historique">
              {historique.map((h, i) => (
                <li key={`${h.le}-${i}`}>
                  <strong>{ACTIONS_JOURNAL[h.action] ?? h.action}</strong>
                  {detailHistorique(h) && <span>{detailHistorique(h)}</span>}
                  <small>{formatDateHeure(h.le)} · {h.auteur}</small>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* ---------- Fenêtres ---------- */}
      {fenetre === 'checkin' && (
        <CheckinModal resa={resa} client={client} onFermer={fermer}
          onTermine={() => apresModale(`Check-in effectué : ${resa.studio_code} est maintenant occupé.`)} />
      )}
      {fenetre === 'prolonger' && (
        <ProlongerModal resa={resa} onFermer={fermer} onTermine={(m) => apresModale(`Départ modifié. Nouveau montant : ${formatFCFA(m)}.`)} />
      )}
      {fenetre === 'studio' && (
        <ChangerStudioModal resa={resa} onFermer={fermer} onTermine={(m) => apresModale(`Studio changé. Nouveau montant : ${formatFCFA(m)}.`)} />
      )}
      {fenetre === 'paiement' && (
        <PaiementModal resa={resa} onFermer={fermer} onTermine={(p) => apresModale(`${TYPES_PAIEMENT[p.type]} de ${formatFCFA(p.montant)} enregistré.`)} />
      )}

      <Confirm
        ouvert={fenetre === 'checkout'}
        titre="Check-out"
        message={`Le client quitte ${resa.studio_code}. Le studio passera en « Nettoyage » et une tâche de ménage sera créée.`}
        libelle="Valider le départ"
        danger={false}
        enCours={enCours}
        desactive={resa.reste_a_payer > 0 && !departSansSolde}
        onConfirmer={() => agir(() => changerStatut(resa.id, 'terminee'), `Check-out effectué : ${resa.studio_code} est à nettoyer.`)}
        onAnnuler={fermer}
      >
        {resa.reste_a_payer > 0 && (
          <div className="rfiche__alerte">
            <strong>Reste à payer : {formatFCFA(resa.reste_a_payer)}</strong>
            <button type="button" className="btn btn-rouge" onClick={() => setFenetre('paiement')}>Encaisser le solde</button>
            <label>
              <input type="checkbox" checked={departSansSolde} onChange={(e) => setDepartSansSolde(e.target.checked)} />
              Valider le départ sans le solde
            </label>
          </div>
        )}
        {cautionVersee > 0 && (
          <p className="rfiche__rappel">Pensez à rendre la caution de {formatFCFA(cautionVersee)} après vérification du studio (« Encaisser » → Restitution de caution).</p>
        )}
      </Confirm>

      <Confirm
        ouvert={fenetre === 'annulee' || fenetre === 'no_show'}
        titre={fenetre === 'annulee' ? 'Annuler la réservation' : 'Client non présenté'}
        message={fenetre === 'annulee'
          ? `La réservation ${resa.reference} sera annulée et ${resa.studio_code} de nouveau disponible sur ces dates.`
          : `Le client ne s’est pas présenté. ${resa.studio_code} redevient disponible sur ces dates.`}
        libelle={fenetre === 'annulee' ? 'Annuler la réservation' : 'Confirmer'}
        enCours={enCours}
        desactive={!motif.trim()}
        onConfirmer={() => agir(() => changerStatut(resa.id, fenetre, motif.trim()),
          fenetre === 'annulee' ? 'Réservation annulée.' : 'Réservation marquée « Non présenté ».')}
        onAnnuler={fermer}
      >
        <div className="champ">
          <label htmlFor="rf-motif">Motif (obligatoire)</label>
          <textarea id="rf-motif" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} autoFocus
            placeholder={fenetre === 'annulee' ? 'Ex : le client a annulé par téléphone' : 'Ex : injoignable, pas venu à 22 h'} />
        </div>
        {resa.total_paye > 0 && (
          <p className="rfiche__rappel">
            {formatFCFA(resa.total_paye)} ont déjà été versés : si vous remboursez le client, enregistrez-le avec « Encaisser » → Remboursement.
          </p>
        )}
      </Confirm>
    </div>
  );
}
