import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listerJournal, TAILLE_PAGE_JOURNAL } from '../../../services/parametres.js';
import { listerPersonnel } from '../../../services/personnel.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatDateHeure, formatFCFA, ACTIONS_JOURNAL, MODULES_JOURNAL } from '../../../lib/format.js';
import './Journal.css';

const FILTRES_VIDES = { module: '', utilisateur: '', du: '', au: '' };

// Libellés lisibles pour les détails enregistrés
const CLES = {
  reference: 'Réf.', montant: 'Montant', acompte: 'Acompte', remise: 'Remise', statut: 'Statut', motif: 'Motif',
  code: 'Studio', studio: 'Studio', nom: 'Nom', titre: 'Titre', libelle: 'Libellé', role: 'Rôle', email: 'Email',
  type: 'Type', mode: 'Mode', cout: 'Coût', priorite: 'Priorité', jour: 'Jour', ecart: 'Écart', compte: 'Compté', attendu: 'Attendu',
  ancien: 'Ancien', nouveau: 'Nouveau', nouveau_studio: 'Nouveau studio', ancien_studio: 'Ancien studio', nouveau_montant: 'Nouveau montant',
};
const MONTANTS = ['montant', 'acompte', 'remise', 'cout', 'ecart', 'compte', 'attendu', 'nouveau_montant'];

function resumeDetails(details) {
  if (!details || typeof details !== 'object') return '';
  return Object.entries(details)
    .filter(([k, v]) => CLES[k] && v !== null && v !== '' && typeof v !== 'object')
    .slice(0, 4)
    .map(([k, v]) => `${CLES[k]} : ${MONTANTS.includes(k) && typeof v === 'number' ? formatFCFA(v) : v}`)
    .join(' · ');
}

// Lien vers l'élément concerné, quand il existe une page pour lui
const lienCible = (l) => {
  if (!l.cible_id) return null;
  if (l.cible_table === 'reservations') return `/admin/reservations/${l.cible_id}`;
  if (l.cible_table === 'clients') return `/admin/clients/${l.cible_id}`;
  return null;
};

// Onglet « Journal d'activité » : qui a fait quoi, quand
export default function Journal() {
  const [filtres, setFiltres] = useState(FILTRES_VIDES);
  const [personnel, setPersonnel] = useState([]);
  const [lignes, setLignes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [plus, setPlus] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => { listerPersonnel().then(setPersonnel).catch(() => setPersonnel([])); }, []);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    setErreur('');
    listerJournal({ ...filtres, page: 0 })
      .then((r) => { if (!annule) { setLignes(r.lignes); setTotal(r.total); setPage(0); } })
      .catch((err) => { if (!annule) setErreur(messageErreur(err, 'Impossible de lire le journal.')); })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [filtres]);

  const afficherPlus = async () => {
    setPlus(true);
    try {
      const r = await listerJournal({ ...filtres, page: page + 1 });
      setLignes((l) => [...l, ...r.lignes]);
      setPage((p) => p + 1);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setPlus(false);
    }
  };

  const maj = (champ) => (e) => setFiltres((f) => ({ ...f, [champ]: e.target.value }));

  return (
    <section className="journal">
      <div className="journal__filtres">
        <select value={filtres.module} onChange={maj('module')} aria-label="Module">
          <option value="">Tous les modules</option>
          {Object.entries(MODULES_JOURNAL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtres.utilisateur} onChange={maj('utilisateur')} aria-label="Employé">
          <option value="">Tout le personnel</option>
          {personnel.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
        </select>
        <label>Du <input type="date" value={filtres.du} onChange={maj('du')} /></label>
        <label>au <input type="date" value={filtres.au} min={filtres.du || undefined} onChange={maj('au')} /></label>
        {JSON.stringify(filtres) !== JSON.stringify(FILTRES_VIDES) && (
          <button type="button" className="journal__effacer" onClick={() => setFiltres(FILTRES_VIDES)}>Effacer</button>
        )}
      </div>

      {chargement ? (
        <p className="journal__etat">Chargement du journal…</p>
      ) : erreur ? (
        <p className="journal__etat journal__etat--erreur">{erreur}</p>
      ) : !lignes.length ? (
        <p className="journal__etat">Aucune action enregistrée{JSON.stringify(filtres) !== JSON.stringify(FILTRES_VIDES) ? ' pour ces filtres' : ''}.</p>
      ) : (
        <>
          <p className="journal__total">{total} action(s)</p>
          <ul className="journal__liste">
            {lignes.map((l) => {
              const lien = lienCible(l);
              const resume = resumeDetails(l.details);
              return (
                <li key={l.id}>
                  <span className="journal__heure">{formatDateHeure(l.created_at)}</span>
                  <div className="journal__contenu">
                    <strong>{lien ? <Link to={lien}>{ACTIONS_JOURNAL[l.action] ?? l.action}</Link> : (ACTIONS_JOURNAL[l.action] ?? l.action)}</strong>
                    {resume && <span>{resume}</span>}
                  </div>
                  <span className="journal__auteur">{l.auteur?.full_name || l.auteur?.email || 'Système'}</span>
                </li>
              );
            })}
          </ul>
          {lignes.length < total && (
            <div className="journal__plus">
              <button type="button" className="btn btn-contour" onClick={afficherPlus} disabled={plus}>
                {plus ? 'Chargement…' : `Afficher plus (${Math.min(TAILLE_PAGE_JOURNAL, total - lignes.length)} sur ${total - lignes.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
