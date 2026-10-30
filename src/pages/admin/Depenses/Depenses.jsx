import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../../../components/Toast/Toast.jsx';
import Confirm from '../../../components/Confirm/Confirm.jsx';
import { listerDepenses, totalDepensesMois, listerCategoriesDepenses, supprimerDepense } from '../../../services/depenses.js';
import { listerStudiosResume } from '../../../services/studios.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, formatDate } from '../../../lib/format.js';
import { telechargerCSV } from '../../../lib/csv.js';
import DepenseModal from './DepenseModal.jsx';
import './Depenses.css';

const pad = (n) => String(n).padStart(2, '0');
const moisCourant = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const decalerMois = (mois, n) => {
  const [a, m] = mois.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const libelleMois = (mois) => new Date(`${mois}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

// Module « Dépenses » (admin, gérant, comptable) : saisie, répartition par catégorie, filtre par mois
export default function Depenses() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const actuel = moisCourant();
  const mois = /^\d{4}-\d{2}$/.test(params.get('mois') ?? '') ? params.get('mois') : actuel;
  const allerAu = (m) => setParams(m === actuel ? {} : { mois: m }, { replace: true });

  const [depenses, setDepenses] = useState([]);
  const [totalPrecedent, setTotalPrecedent] = useState(0);
  const [categories, setCategories] = useState([]);
  const [studios, setStudios] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [filtres, setFiltres] = useState({ categorie: '', studio: '', texte: '' });
  const [edition, setEdition] = useState(null); // { depense } (null = nouvelle)
  const [aSupprimer, setASupprimer] = useState(null);
  const [suppression, setSuppression] = useState(false);

  const charger = useCallback(async () => {
    setErreur('');
    try {
      const [d, prec, c, s] = await Promise.all([
        listerDepenses(mois), totalDepensesMois(decalerMois(mois, -1)), listerCategoriesDepenses(), listerStudiosResume(),
      ]);
      setDepenses(d);
      setTotalPrecedent(prec);
      setCategories(c);
      setStudios(s);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger les dépenses.'));
    } finally {
      setChargement(false);
    }
  }, [mois]);

  useEffect(() => { setChargement(true); charger(); }, [charger]);

  const total = depenses.reduce((t, d) => t + d.montant, 0);
  const evolution = totalPrecedent ? Math.round(((total - totalPrecedent) / totalPrecedent) * 100) : null;

  // Répartition par catégorie (du plus gros poste au plus petit)
  const repartition = useMemo(() => {
    const m = {};
    for (const d of depenses) m[d.categorie] = (m[d.categorie] ?? 0) + d.montant;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [depenses]);

  const visibles = useMemo(() => {
    const q = filtres.texte.trim().toLowerCase();
    return depenses.filter((d) =>
      (!filtres.categorie || d.categorie === filtres.categorie) &&
      (!filtres.studio || (filtres.studio === 'aucun' ? !d.studio_id : d.studio_id === filtres.studio)) &&
      (!q || d.libelle.toLowerCase().includes(q)));
  }, [depenses, filtres]);
  const totalVisible = visibles.reduce((t, d) => t + d.montant, 0);
  const filtre = filtres.categorie || filtres.studio || filtres.texte.trim();

  const supprimer = async () => {
    setSuppression(true);
    try {
      await supprimerDepense(aSupprimer);
      toast.succes('Dépense supprimée.');
      charger();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setSuppression(false);
      setASupprimer(null);
    }
  };

  const exporter = () => telechargerCSV(`depenses-${mois}.csv`, [
    { titre: 'Date', valeur: (d) => formatDate(d.date_depense) },
    { titre: 'Catégorie', valeur: (d) => d.categorie },
    { titre: 'Libellé', valeur: (d) => d.libelle },
    { titre: 'Studio', valeur: (d) => d.studio?.code ?? '' },
    { titre: 'Montant (FCFA)', valeur: (d) => d.montant },
    { titre: 'Saisi par', valeur: (d) => d.par?.full_name ?? '' },
  ], visibles);

  const majFiltre = (champ) => (e) => setFiltres((f) => ({ ...f, [champ]: e.target.value }));

  return (
    <div className="depenses">
      <header className="depenses__entete">
        <div>
          <h1>Dépenses</h1>
          <p>Électricité, eau, salaires, entretien, réparations…</p>
        </div>
        <button className="btn btn-rouge" onClick={() => setEdition({ depense: null })}>+ Nouvelle dépense</button>
      </header>

      <div className="depenses__navigation">
        <button type="button" className="depenses__fleche" onClick={() => allerAu(decalerMois(mois, -1))} aria-label="Mois précédent">‹</button>
        <h2>{libelleMois(mois)}</h2>
        <button type="button" className="depenses__fleche" onClick={() => allerAu(decalerMois(mois, 1))} disabled={mois >= actuel} aria-label="Mois suivant">›</button>
        {mois !== actuel && <button type="button" className="btn btn-contour" onClick={() => allerAu(actuel)}>Ce mois-ci</button>}
      </div>

      {chargement ? (
        <div className="depenses__etat">Chargement des dépenses…</div>
      ) : erreur ? (
        <div className="depenses__etat depenses__etat--erreur">
          <p>{erreur}</p>
          <button className="btn btn-contour" onClick={charger}>Réessayer</button>
        </div>
      ) : (
        <>
          <section className="depenses__kpis">
            <div className="depenses__kpi depenses__kpi--rouge">
              <span>Total du mois</span>
              <strong>{formatFCFA(total)}</strong>
              <small>
                {evolution === null ? 'Pas de dépenses le mois précédent'
                  : `${evolution > 0 ? '+' : ''}${evolution} % par rapport à ${libelleMois(decalerMois(mois, -1))}`}
              </small>
            </div>
            <div className="depenses__kpi"><span>Nombre de dépenses</span><strong>{depenses.length}</strong></div>
            <div className="depenses__kpi">
              <span>Plus gros poste</span>
              <strong className="depenses__poste">{repartition[0]?.[0] ?? '—'}</strong>
              {repartition[0] && <small>{formatFCFA(repartition[0][1])}</small>}
            </div>
          </section>

          <div className="depenses__grille">
            {/* ---- Liste ---- */}
            <section className="depenses__carte">
              <div className="depenses__filtres">
                <input type="search" placeholder="Rechercher un libellé…" value={filtres.texte} onChange={majFiltre('texte')} aria-label="Rechercher" />
                <select value={filtres.categorie} onChange={majFiltre('categorie')} aria-label="Catégorie">
                  <option value="">Toutes les catégories</option>
                  {[...new Set([...categories, ...depenses.map((d) => d.categorie)])].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filtres.studio} onChange={majFiltre('studio')} aria-label="Studio">
                  <option value="">Tous (résidence et studios)</option>
                  <option value="aucun">Résidence (sans studio)</option>
                  {studios.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.nom}</option>)}
                </select>
              </div>

              {!depenses.length ? (
                <div className="depenses__vide">
                  <p>Aucune dépense en {libelleMois(mois)}.</p>
                  <button className="btn btn-rouge" onClick={() => setEdition({ depense: null })}>Saisir une dépense</button>
                </div>
              ) : !visibles.length ? (
                <p className="depenses__vide">Aucune dépense ne correspond aux filtres.</p>
              ) : (
                <>
                  <ul className="depenses__liste">
                    {visibles.map((d) => (
                      <li key={d.id}>
                        <div className="depenses__infos">
                          <strong>{d.libelle}</strong>
                          <span><span className="depenses__categorie">{d.categorie}</span>{d.studio ? ` · ${d.studio.code}` : ''}</span>
                          <small>{formatDate(d.date_depense)}{d.par?.full_name ? ` · saisie par ${d.par.full_name}` : ''}</small>
                        </div>
                        <div className="depenses__droite">
                          <strong>{formatFCFA(d.montant)}</strong>
                          <span>
                            <button type="button" onClick={() => setEdition({ depense: d })}>Modifier</button>
                            <button type="button" className="depenses__supprimer" onClick={() => setASupprimer(d)}>Supprimer</button>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="depenses__pied">
                    <span>{filtre ? `${visibles.length} dépense(s) filtrée(s) : ` : 'Total : '}<strong>{formatFCFA(totalVisible)}</strong></span>
                    <button type="button" className="btn btn-contour" onClick={exporter}>Exporter (Excel)</button>
                  </div>
                </>
              )}
            </section>

            {/* ---- Répartition ---- */}
            <section className="depenses__carte">
              <h2>Répartition par catégorie</h2>
              {!repartition.length ? (
                <p className="depenses__vide">—</p>
              ) : (
                <ul className="depenses__repartition">
                  {repartition.map(([cat, montant]) => (
                    <li key={cat}>
                      <button type="button" onClick={() => setFiltres((f) => ({ ...f, categorie: f.categorie === cat ? '' : cat }))}
                        className={filtres.categorie === cat ? 'depenses__rep--active' : ''}>
                        <span className="depenses__rep-titre"><span>{cat}</span><strong>{formatFCFA(montant)}</strong></span>
                        <span className="depenses__barre"><span style={{ width: `${(montant / total) * 100}%` }} /></span>
                        <small>{Math.round((montant / total) * 100)} %</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {edition && (
        <DepenseModal depense={edition.depense} categories={categories} studios={studios}
          onFermer={() => setEdition(null)}
          onEnregistre={(d) => {
            toast.succes(edition.depense ? 'Dépense modifiée.' : 'Dépense enregistrée.');
            setEdition(null);
            const m = d.date_depense.slice(0, 7);
            if (m !== mois) allerAu(m); else charger(); // affiche le mois de la dépense
          }} />
      )}

      <Confirm
        ouvert={!!aSupprimer}
        titre="Supprimer la dépense"
        message={aSupprimer && `Supprimer « ${aSupprimer.libelle} » (${formatFCFA(aSupprimer.montant)}) ?`}
        libelle="Supprimer"
        enCours={suppression}
        onConfirmer={supprimer}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  );
}
