import { useCallback, useEffect, useMemo, useState } from 'react';
import { listerStudios, listerCategories, modifierStudio, supprimerStudio } from '../../../services/studios.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { STATUTS_STUDIO } from '../../../lib/format.js';
import { useToast } from '../../../components/Toast/Toast.jsx';
import Confirm from '../../../components/Confirm/Confirm.jsx';
import StudioCarte from './StudioCarte.jsx';
import StudioModal from './StudioModal.jsx';
import './Studios.css';

// Module « Studios & tarifs » (admin, gérant)
export default function Studios() {
  const toast = useToast();
  const [studios, setStudios] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [edition, setEdition] = useState(null); // { studio (null = nouveau), onglet }
  const [aSupprimer, setASupprimer] = useState(null);
  const [suppression, setSuppression] = useState(false);

  const charger = useCallback(async () => {
    setErreur('');
    try {
      const [s, c] = await Promise.all([listerStudios(), listerCategories()]);
      setStudios(s);
      setCategories(c);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger les studios.'));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return studios.filter((s) =>
      (!filtreStatut || s.statut === filtreStatut) &&
      (!q || s.code.toLowerCase().includes(q) || s.nom.toLowerCase().includes(q)));
  }, [studios, recherche, filtreStatut]);

  // Changement rapide depuis la carte (affichage immédiat, rechargement si échec)
  const changerRapide = async (studio, valeurs, action, message) => {
    setStudios((liste) => liste.map((s) => (s.id === studio.id ? { ...s, ...valeurs } : s)));
    try {
      await modifierStudio(studio.id, valeurs, action);
      toast.succes(message);
    } catch (err) {
      toast.erreur(messageErreur(err));
      charger();
    }
  };

  const supprimer = async () => {
    setSuppression(true);
    try {
      await supprimerStudio(aSupprimer);
      toast.succes(`Studio ${aSupprimer.code} supprimé.`);
      charger();
    } catch (err) {
      toast.erreur(err.code === '23503'
        ? 'Ce studio a des réservations : il ne peut pas être supprimé. Dépubliez-le ou mettez-le « Hors service ».'
        : messageErreur(err));
    } finally {
      setSuppression(false);
      setASupprimer(null);
    }
  };

  const nbPublies = studios.filter((s) => s.publie).length;

  return (
    <div className="studios">
      <header className="studios__entete">
        <div>
          <h1>Studios & tarifs</h1>
          {!chargement && !erreur && (
            <p>{studios.length} studio(s) · {nbPublies} visible(s) sur le site</p>
          )}
        </div>
        <button className="btn btn-rouge" onClick={() => setEdition({ studio: null, onglet: 'infos' })}>
          + Nouveau studio
        </button>
      </header>

      {studios.length > 0 && (
        <div className="studios__filtres">
          <input type="search" placeholder="Rechercher un code ou un nom…" value={recherche}
            onChange={(e) => setRecherche(e.target.value)} aria-label="Rechercher un studio" />
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} aria-label="Filtrer par statut">
            <option value="">Tous les statuts</option>
            {Object.entries(STATUTS_STUDIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      )}

      {chargement ? (
        <div className="studios__etat">Chargement des studios…</div>
      ) : erreur ? (
        <div className="studios__etat studios__etat--erreur">
          <p>{erreur}</p>
          <button className="btn btn-contour" onClick={charger}>Réessayer</button>
        </div>
      ) : !studios.length ? (
        <div className="studios__etat">
          <p>Aucun studio enregistré pour le moment.</p>
          <button className="btn btn-rouge" onClick={() => setEdition({ studio: null, onglet: 'infos' })}>
            Créer le premier studio
          </button>
        </div>
      ) : !visibles.length ? (
        <div className="studios__etat">Aucun studio ne correspond à votre recherche.</div>
      ) : (
        <div className="studios__grille">
          {visibles.map((s) => (
            <StudioCarte
              key={s.id}
              studio={s}
              onOuvrir={(onglet) => setEdition({ studio: s, onglet })}
              onStatut={(statut) => changerRapide(s, { statut }, 'studio.statut', `${s.code} : ${STATUTS_STUDIO[statut]}.`)}
              onPublier={(publie) => changerRapide(s, { publie }, 'studio.publication',
                publie ? `${s.code} est visible sur le site.` : `${s.code} est masqué du site.`)}
              onSupprimer={() => setASupprimer(s)}
            />
          ))}
        </div>
      )}

      {edition && (
        <StudioModal
          studio={edition.studio}
          ongletInitial={edition.onglet}
          categories={categories}
          studios={studios}
          onFermer={() => setEdition(null)}
          onChange={charger}
        />
      )}

      <Confirm
        ouvert={!!aSupprimer}
        titre="Supprimer le studio"
        message={aSupprimer && `Supprimer définitivement ${aSupprimer.code} – ${aSupprimer.nom}, ses tarifs et ses photos ? Cette action est irréversible.`}
        libelle="Supprimer"
        enCours={suppression}
        onConfirmer={supprimer}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  );
}
