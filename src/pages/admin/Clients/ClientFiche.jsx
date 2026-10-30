import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { lireClient, historiqueClient, mettreEnListeNoire, retirerDeListeNoire } from '../../../services/clients.js';
import { useToast } from '../../../components/Toast/Toast.jsx';
import Confirm from '../../../components/Confirm/Confirm.jsx';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, formatDate, formatDateHeure, FORMULES, STATUTS_RESERVATION } from '../../../lib/format.js';
import { formatTelephone, lienWhatsApp } from '../../../lib/telephone.js';
import ClientModal from './ClientModal.jsx';
import './ClientFiche.css';

// Fiche d'un client : coordonnées, pièce d'identité, statistiques, historique, liste noire
export default function ClientFiche() {
  const { id } = useParams();
  const toast = useToast();
  const [client, setClient] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [edition, setEdition] = useState(false);
  const [confirmNoire, setConfirmNoire] = useState(false);
  const [motif, setMotif] = useState('');
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    setErreur('');
    try {
      const [c, r] = await Promise.all([lireClient(id), historiqueClient(id)]);
      setClient(c);
      setReservations(r);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger la fiche client.'));
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => { setChargement(true); charger(); }, [charger]);

  const basculerListeNoire = async () => {
    setEnCours(true);
    try {
      if (client.liste_noire) {
        await retirerDeListeNoire(client.id);
        toast.succes(`${client.full_name} a été retiré(e) de la liste noire.`);
      } else {
        await mettreEnListeNoire(client.id, motif.trim());
        toast.succes(`${client.full_name} est en liste noire.`);
      }
      setConfirmNoire(false);
      setMotif('');
      charger();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  };

  if (chargement) return <div className="fiche__etat">Chargement de la fiche…</div>;
  if (erreur) {
    return (
      <div className="fiche__etat fiche__etat--erreur">
        <p>{erreur}</p>
        <button className="btn btn-contour" onClick={charger}>Réessayer</button>
      </div>
    );
  }
  if (!client) {
    return (
      <div className="fiche__etat">
        <p>Ce client n’existe pas ou a été supprimé.</p>
        <Link className="btn btn-contour" to="/admin/clients">Retour aux clients</Link>
      </div>
    );
  }

  const messageWhatsApp = `Bonjour ${client.full_name}, ici Zaquia Résidence.`;

  return (
    <div className="fiche">
      <Link to="/admin/clients" className="fiche__retour">← Clients</Link>

      <header className="fiche__entete">
        <div>
          <h1>{client.full_name}</h1>
          <p>Client depuis le {formatDate(client.created_at)}{client.nationalite ? ` · ${client.nationalite}` : ''}</p>
        </div>
        <div className="fiche__boutons">
          <a className="btn btn-contour" href={`tel:${client.phone}`}>Appeler</a>
          <a className="btn btn-contour" href={lienWhatsApp(client.phone, messageWhatsApp)} target="_blank" rel="noreferrer">WhatsApp</a>
          <button className="btn btn-primaire" onClick={() => setEdition(true)}>Modifier</button>
        </div>
      </header>

      {client.liste_noire && (
        <div className="fiche__noire">
          <div>
            <strong>Client en liste noire</strong>
            <p>{client.liste_noire_motif || 'Aucun motif indiqué.'}</p>
            {client.liste_noire_le && <small>Depuis le {formatDate(client.liste_noire_le)} · réservation en ligne bloquée</small>}
          </div>
          <button className="btn btn-contour" onClick={() => setConfirmNoire(true)}>Retirer de la liste noire</button>
        </div>
      )}

      <section className="fiche__stats">
        <div><span>Réservations</span><strong>{client.nb_reservations}</strong></div>
        <div><span>Séjours terminés</span><strong>{client.nb_sejours}</strong></div>
        <div><span>Total dépensé</span><strong>{formatFCFA(client.total_depense)}</strong></div>
        <div><span>Dernier séjour</span><strong>{client.dernier_sejour ? formatDate(client.dernier_sejour) : '—'}</strong></div>
      </section>

      <div className="fiche__grille">
        <section className="fiche__carte">
          <h2>Coordonnées</h2>
          <dl className="fiche__infos">
            <dt>Téléphone</dt><dd>{formatTelephone(client.phone)}</dd>
            <dt>Email</dt><dd>{client.email || '—'}</dd>
            <dt>Nationalité</dt><dd>{client.nationalite || '—'}</dd>
          </dl>

          <h2>Pièce d’identité</h2>
          {client.piece_numero ? (
            <dl className="fiche__infos">
              <dt>Type</dt><dd>{client.piece_type}</dd>
              <dt>Numéro</dt><dd className="fiche__numero">{client.piece_numero}</dd>
            </dl>
          ) : (
            <p className="fiche__manque">Non renseignée : à demander au check-in.</p>
          )}

          <h2>Notes internes</h2>
          <p className="fiche__notes">{client.notes || 'Aucune note.'}</p>

          {!client.liste_noire && (
            <button className="fiche__lien-noire" onClick={() => setConfirmNoire(true)}>Mettre en liste noire</button>
          )}
        </section>

        <section className="fiche__carte">
          <h2>Historique des réservations</h2>
          {!reservations.length ? (
            <p className="fiche__manque">Aucune réservation pour ce client.</p>
          ) : (
            <ul className="fiche__historique">
              {reservations.map((r) => (
                <li key={r.id}>
                  <div>
                    <Link to={`/admin/reservations/${r.id}`} className="fiche__ref">{r.reference}</Link>
                    <span>{r.studio_code} – {r.studio_nom} · {FORMULES[r.formule]}</span>
                    <small>{formatDateHeure(r.date_debut)} → {formatDateHeure(r.date_fin)}</small>
                  </div>
                  <div className="fiche__historique-droite">
                    <span className={`badge badge-${r.statut}`}>{STATUTS_RESERVATION[r.statut]}</span>
                    <strong>{formatFCFA(r.montant_total - r.remise)}</strong>
                    {r.reste_a_payer > 0 && !['annulee', 'no_show'].includes(r.statut) && (
                      <small>Reste {formatFCFA(r.reste_a_payer)}</small>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {edition && <ClientModal client={client} onFermer={() => setEdition(false)} onEnregistre={charger} />}

      <Confirm
        ouvert={confirmNoire}
        titre={client.liste_noire ? 'Retirer de la liste noire' : 'Mettre en liste noire'}
        message={client.liste_noire
          ? `${client.full_name} pourra de nouveau réserver en ligne.`
          : `${client.full_name} ne pourra plus réserver en ligne. Le motif reste visible uniquement par le personnel.`}
        libelle={client.liste_noire ? 'Retirer' : 'Mettre en liste noire'}
        danger={!client.liste_noire}
        enCours={enCours}
        desactive={!client.liste_noire && !motif.trim()}
        onConfirmer={basculerListeNoire}
        onAnnuler={() => { setConfirmNoire(false); setMotif(''); }}
      >
        {!client.liste_noire && (
          <div className="champ">
            <label htmlFor="motif-noire">Motif (obligatoire)</label>
            <textarea id="motif-noire" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex : dégradations dans le studio S102, impayé…" autoFocus />
          </div>
        )}
      </Confirm>
    </div>
  );
}
