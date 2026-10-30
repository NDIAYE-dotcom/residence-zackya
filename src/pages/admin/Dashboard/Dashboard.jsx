import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';
import { lireParametres } from '../../../services/parametres.js';
import { Link } from 'react-router-dom';
import { chargerTableauDeBord } from '../../../services/dashboard.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, formatDateHeure, FORMULES, STATUTS_RESERVATION, STATUTS_STUDIO } from '../../../lib/format.js';
import './Dashboard.css';

export default function Dashboard() {
  const [studios, setStudios] = useState([]);
  const [arrivees, setArrivees] = useState([]);
  const [departs, setDeparts] = useState([]);
  const [enAttente, setEnAttente] = useState(0);
  const [encaisseJour, setEncaisseJour] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const { profile } = useAuth();
  const [rappelSauvegarde, setRappelSauvegarde] = useState(false);

  // Admin : rappel si aucune sauvegarde depuis 30 jours
  useEffect(() => {
    if (profile?.role !== 'admin') return;
    lireParametres().then((p) => {
      const derniere = p.derniere_sauvegarde ? new Date(p.derniere_sauvegarde) : null;
      setRappelSauvegarde(!derniere || Date.now() - derniere > 30 * 86400000);
    }).catch(() => {});
  }, [profile?.role]);

  const charger = async () => {
    setErreur('');
    try {
      const t = await chargerTableauDeBord();
      setStudios(t.studios);
      setArrivees(t.arrivees);
      setDeparts(t.departs);
      setEnAttente(t.enAttente);
      setEncaisseJour(t.encaisseJour);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger le tableau de bord.'));
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, []);

  if (erreur) {
    return (
      <div className="dash">
        <h1 className="dash__titre">Tableau de bord</h1>
        <div className="carte dash__erreur"><p>{erreur}</p><button className="btn btn-contour" onClick={charger}>Réessayer</button></div>
      </div>
    );
  }

  // Les studios hors service ne comptent pas dans le taux d'occupation
  const enService = studios.filter((s) => s.statut !== 'hors_service');
  const occupes = enService.filter((s) => s.statut === 'occupe').length;
  const taux = enService.length ? Math.round((occupes / enService.length) * 100) : 0;

  return (
    <div className="dash">
      <h1 className="dash__titre">Tableau de bord</h1>

      {rappelSauvegarde && (
        <div className="dash__rappel">
          💾 Aucune sauvegarde des données depuis plus de 30 jours.
          <Link to="/admin/parametres?onglet=sauvegarde">Faire une sauvegarde</Link>
        </div>
      )}

      <section className="dash__kpis">
        <div className="kpi"><span>Taux d’occupation</span><strong>{taux} %</strong><small>{occupes} / {enService.length} studios en service</small></div>
        <div className="kpi kpi--rouge"><span>À confirmer</span><strong>{enAttente}</strong><small>réservations en attente</small></div>
        <div className="kpi"><span>Arrivées du jour</span><strong>{arrivees.length}</strong><small>check-in prévus</small></div>
        <div className="kpi"><span>Encaissé aujourd’hui</span><strong>{formatFCFA(encaisseJour)}</strong><small>hors cautions</small></div>
      </section>

      <section className="dash__grille">
        <div className="carte">
          <h2>État des studios</h2>
          {chargement ? <p className="vide">Chargement…</p> : (
            <div className="dash__studios">
              {studios.map((s) => (
                <div key={s.id} className={`studio-tuile studio-tuile--${s.statut}`}>
                  <strong>{s.code}</strong>
                  <span>{STATUTS_STUDIO[s.statut]}</span>
                </div>
              ))}
              {!studios.length && <p className="vide">Aucun studio enregistré.</p>}
            </div>
          )}
        </div>

        <div className="carte">
          <h2>Arrivées du jour</h2>
          <ListeResa items={arrivees} champDate="date_debut" vide="Aucune arrivée prévue." />
        </div>

        <div className="carte">
          <h2>Départs du jour</h2>
          <ListeResa items={departs} champDate="date_fin" vide="Aucun départ prévu." />
        </div>
      </section>
    </div>
  );
}

function ListeResa({ items, champDate, vide }) {
  if (!items.length) return <p className="vide">{vide}</p>;
  return (
    <ul className="dash__liste">
      {items.map((r) => (
        <li key={r.id}>
          <div>
            <Link to={`/admin/reservations/${r.id}`} className="dash__lien">{r.client_nom}</Link>
            <span>{r.studio_code} · {FORMULES[r.formule]} · {formatDateHeure(r[champDate])}</span>
          </div>
          <div className="dash__liste-droite">
            <span className={`badge badge-${r.statut}`}>{STATUTS_RESERVATION[r.statut]}</span>
            {r.reste_a_payer > 0 && <small>Reste {formatFCFA(r.reste_a_payer)}</small>}
          </div>
        </li>
      ))}
    </ul>
  );
}
