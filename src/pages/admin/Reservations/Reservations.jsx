import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { rechercherReservations, TAILLE_PAGE } from '../../../services/reservations.js';
import { listerStudiosResume } from '../../../services/studios.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, FORMULES, STATUTS_RESERVATION, SOURCES_RESERVATION } from '../../../lib/format.js';
import { formatJourHeure, versChampJour } from '../../../lib/dates.js';
import { formatTelephone } from '../../../lib/telephone.js';
import './Reservations.css';

const FILTRES_VIDES = { recherche: '', statut: 'actives', studioId: '', source: '', du: '', au: '' };

// Raccourcis de période
const aujourdhui = () => versChampJour(new Date());
const dansJours = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return versChampJour(d); };
const PERIODES = [
  { id: 'jour', label: 'Aujourd’hui', du: aujourdhui, au: aujourdhui },
  { id: 'semaine', label: '7 prochains jours', du: aujourdhui, au: () => dansJours(7) },
  { id: 'mois', label: '30 prochains jours', du: aujourdhui, au: () => dansJours(30) },
];

// Module « Réservations » : liste filtrable (création : /admin/reservations/nouvelle)
export default function Reservations() {
  const { profile } = useAuth();
  const location = useLocation();
  const peutCreer = ['admin', 'gerant', 'receptionniste'].includes(profile?.role);
  const peutVoirClients = peutCreer; // le comptable n'a pas accès aux fiches clients
  const nouvelle = location.state?.nouvelle; // référence créée à mettre en évidence

  const [filtres, setFiltres] = useState(FILTRES_VIDES);
  const [studios, setStudios] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [chargementPlus, setChargementPlus] = useState(false);
  const [erreur, setErreur] = useState('');
  const [essai, setEssai] = useState(0);

  useEffect(() => { listerStudiosResume().then(setStudios).catch(() => setStudios([])); }, []);

  // Recharge à chaque changement de filtre (300 ms après la dernière frappe)
  useEffect(() => {
    let annule = false;
    setChargement(true);
    const minuteur = setTimeout(async () => {
      setErreur('');
      try {
        const res = await rechercherReservations({ ...filtres, page: 0 });
        if (annule) return;
        setReservations(res.reservations);
        setTotal(res.total);
        setPage(0);
      } catch (err) {
        if (!annule) setErreur(messageErreur(err, 'Impossible de charger les réservations.'));
      } finally {
        if (!annule) setChargement(false);
      }
    }, 300);
    return () => { annule = true; clearTimeout(minuteur); };
  }, [filtres, essai]);

  const afficherPlus = async () => {
    setChargementPlus(true);
    try {
      const res = await rechercherReservations({ ...filtres, page: page + 1 });
      setReservations((liste) => [...liste, ...res.reservations]);
      setPage((p) => p + 1);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setChargementPlus(false);
    }
  };

  const maj = (champ) => (e) => setFiltres((f) => ({ ...f, [champ]: e.target.value }));
  const periodeActive = PERIODES.find((p) => filtres.du === p.du() && filtres.au === p.au())?.id;
  const choisirPeriode = (p) => setFiltres((f) => (periodeActive === p.id ? { ...f, du: '', au: '' } : { ...f, du: p.du(), au: p.au() }));
  const filtresModifies = JSON.stringify(filtres) !== JSON.stringify(FILTRES_VIDES);

  return (
    <div className="resas">
      <header className="resas__entete">
        <div>
          <h1>Réservations</h1>
          {!chargement && !erreur && <p>{total} réservation(s)</p>}
        </div>
        {peutCreer && <Link className="btn btn-rouge" to="/admin/reservations/nouvelle">+ Nouvelle réservation</Link>}
      </header>

      <section className="resas__filtres">
        <input type="search" className="resas__recherche" placeholder="Référence, nom ou téléphone du client…"
          value={filtres.recherche} onChange={maj('recherche')} aria-label="Rechercher une réservation" />

        <div className="resas__selects">
          <select value={filtres.statut} onChange={maj('statut')} aria-label="Statut">
            <option value="actives">Actives (en attente, confirmées, en cours)</option>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUTS_RESERVATION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filtres.studioId} onChange={maj('studioId')} aria-label="Studio">
            <option value="">Tous les studios</option>
            {studios.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.nom}</option>)}
          </select>
          <select value={filtres.source} onChange={maj('source')} aria-label="Source">
            <option value="">Toutes les sources</option>
            {Object.entries(SOURCES_RESERVATION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="resas__periode">
          {PERIODES.map((p) => (
            <button key={p.id} type="button" onClick={() => choisirPeriode(p)}
              className={`resas__puce ${periodeActive === p.id ? 'resas__puce--active' : ''}`}>
              {p.label}
            </button>
          ))}
          <label>Du <input type="date" value={filtres.du} onChange={maj('du')} /></label>
          <label>au <input type="date" value={filtres.au} min={filtres.du || undefined} onChange={maj('au')} /></label>
          {filtresModifies && (
            <button type="button" className="resas__effacer" onClick={() => setFiltres(FILTRES_VIDES)}>Effacer les filtres</button>
          )}
        </div>
      </section>

      {chargement ? (
        <div className="resas__etat">Chargement des réservations…</div>
      ) : erreur ? (
        <div className="resas__etat resas__etat--erreur">
          <p>{erreur}</p>
          <button className="btn btn-contour" onClick={() => setEssai((n) => n + 1)}>Réessayer</button>
        </div>
      ) : !reservations.length ? (
        <div className="resas__etat">
          <p>{filtresModifies ? 'Aucune réservation ne correspond à ces filtres.' : 'Aucune réservation active pour le moment.'}</p>
          {peutCreer && !filtresModifies && (
            <Link className="btn btn-rouge" to="/admin/reservations/nouvelle">Créer une réservation</Link>
          )}
        </div>
      ) : (
        <>
          <div className="resas__tableau" role="table" aria-label="Liste des réservations">
            <div className="resas__ligne resas__ligne--titre" role="row">
              <span role="columnheader">Référence</span>
              <span role="columnheader">Client</span>
              <span role="columnheader">Studio</span>
              <span role="columnheader">Séjour</span>
              <span role="columnheader">Statut</span>
              <span role="columnheader">Montant</span>
            </div>
            {reservations.map((r) => {
              const net = r.montant_total - r.remise;
              const close = ['annulee', 'no_show'].includes(r.statut);
              return (
                <div key={r.id} role="row"
                  className={`resas__ligne ${r.reference === nouvelle ? 'resas__ligne--nouvelle' : ''} ${close ? 'resas__ligne--close' : ''}`}>
                  <span role="cell" className="resas__ref">
                    <strong>{r.reference}</strong>
                    <small>{SOURCES_RESERVATION[r.source]}</small>
                  </span>
                  <span role="cell" className="resas__client">
                    {peutVoirClients ? <Link to={`/admin/clients/${r.client_id}`}>{r.client_nom}</Link> : <strong>{r.client_nom}</strong>}
                    <small>{formatTelephone(r.client_phone)}</small>
                  </span>
                  <span role="cell" className="resas__studio">
                    <strong>{r.studio_code}</strong>
                    <small>{FORMULES[r.formule]}</small>
                  </span>
                  <span role="cell" className="resas__dates">
                    <span>{formatJourHeure(r.date_debut)}</span>
                    <small>→ {formatJourHeure(r.date_fin)}</small>
                  </span>
                  <span role="cell"><span className={`badge badge-${r.statut}`}>{STATUTS_RESERVATION[r.statut]}</span></span>
                  <span role="cell" className="resas__montant">
                    <strong>{formatFCFA(net)}</strong>
                    {!close && (r.reste_a_payer > 0
                      ? <small className="resas__reste">Reste {formatFCFA(r.reste_a_payer)}</small>
                      : <small className="resas__solde">Soldé</small>)}
                  </span>
                </div>
              );
            })}
          </div>

          {reservations.length < total && (
            <div className="resas__plus">
              <button className="btn btn-contour" onClick={afficherPlus} disabled={chargementPlus}>
                {chargementPlus ? 'Chargement…' : `Afficher plus (${Math.min(TAILLE_PAGE, total - reservations.length)} sur ${total - reservations.length} restantes)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
