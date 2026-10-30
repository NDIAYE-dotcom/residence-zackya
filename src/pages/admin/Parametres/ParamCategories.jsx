import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../../components/Toast/Toast.jsx';
import Confirm from '../../../components/Confirm/Confirm.jsx';
import {
  listerCategoriesStudios, enregistrerCategorieStudio, supprimerCategorieStudio,
  listerCategoriesDepensesAdmin, modifierCategorieDepense, renommerCategorieDepense, supprimerCategorieDepense,
} from '../../../services/parametres.js';
import { ajouterCategorieDepense } from '../../../services/depenses.js';
import { messageErreur } from '../../../lib/erreurs.js';
import './ParamCategories.css';

const VIDE_STUDIO = { id: null, nom: '', description: '', capacite: 2 };

// Onglet « Catégories » : catégories de studios et de dépenses
export default function ParamCategories() {
  const toast = useToast();
  const [catStudios, setCatStudios] = useState([]);
  const [catDepenses, setCatDepenses] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [edition, setEdition] = useState(null); // catégorie de studio en cours d'édition
  const [renommage, setRenommage] = useState(null); // { ancien, nouveau }
  const [nouvelleDepense, setNouvelleDepense] = useState('');
  const [aSupprimer, setASupprimer] = useState(null); // { type, element }
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(async () => {
    setErreur('');
    try {
      const [s, d] = await Promise.all([listerCategoriesStudios(), listerCategoriesDepensesAdmin()]);
      setCatStudios(s);
      setCatDepenses(d);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger les catégories.'));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const executer = async (fn, message) => {
    setOccupe(true);
    try { await fn(); if (message) toast.succes(message); await charger(); return true; } catch (err) { toast.erreur(messageErreur(err)); return false; } finally { setOccupe(false); }
  };

  const enregistrerStudio = async (e) => {
    e.preventDefault();
    if (!edition.nom.trim()) return toast.erreur('Le nom est obligatoire.');
    if (await executer(() => enregistrerCategorieStudio(edition), 'Catégorie enregistrée.')) setEdition(null);
  };

  // Ordre des catégories de dépenses : échange avec la voisine
  const deplacer = (index, sens) => {
    const a = catDepenses[index];
    const b = catDepenses[index + sens];
    if (!b) return;
    const ordreA = a.ordre === b.ordre ? a.ordre + sens : b.ordre;
    executer(async () => {
      await modifierCategorieDepense(a.nom, { ordre: ordreA });
      await modifierCategorieDepense(b.nom, { ordre: a.ordre });
    });
  };

  const renommer = async (e) => {
    e.preventDefault();
    if (await executer(() => renommerCategorieDepense(renommage.ancien, renommage.nouveau), 'Catégorie renommée (dépenses mises à jour).')) setRenommage(null);
  };

  const ajouterDepense = async (e) => {
    e.preventDefault();
    const nom = nouvelleDepense.trim();
    if (!nom) return;
    if (await executer(() => ajouterCategorieDepense(nom), 'Catégorie ajoutée.')) setNouvelleDepense('');
  };

  const supprimer = async () => {
    const { type, element } = aSupprimer;
    await executer(() => (type === 'studio' ? supprimerCategorieStudio(element) : supprimerCategorieDepense(element.nom)), 'Catégorie supprimée.');
    setASupprimer(null);
  };

  if (chargement) return <div className="pcat__etat">Chargement…</div>;
  if (erreur) return <div className="pcat__etat pcat__etat--erreur"><p>{erreur}</p><button className="btn btn-contour" onClick={charger}>Réessayer</button></div>;

  return (
    <div className="pcat">
      {/* ---------- Catégories de studios ---------- */}
      <section className="pcat__carte">
        <div className="pcat__titre">
          <div><h2>Catégories de studios</h2><p>Visibles sur le site (ex : Standard, Confort, Suite).</p></div>
          {!edition && <button type="button" className="btn btn-primaire" onClick={() => setEdition(VIDE_STUDIO)}>+ Catégorie</button>}
        </div>

        {edition && (
          <form className="pcat__formulaire" onSubmit={enregistrerStudio}>
            <div className="champ"><label htmlFor="pc-nom">Nom</label><input id="pc-nom" value={edition.nom} autoFocus onChange={(e) => setEdition((c) => ({ ...c, nom: e.target.value }))} /></div>
            <div className="champ"><label htmlFor="pc-cap">Capacité habituelle</label><input id="pc-cap" type="number" min="1" value={edition.capacite} onChange={(e) => setEdition((c) => ({ ...c, capacite: e.target.value }))} /></div>
            <div className="champ pcat__large"><label htmlFor="pc-desc">Description</label><input id="pc-desc" value={edition.description ?? ''} onChange={(e) => setEdition((c) => ({ ...c, description: e.target.value }))} /></div>
            <div className="pcat__boutons">
              <button type="button" className="btn btn-contour" onClick={() => setEdition(null)} disabled={occupe}>Annuler</button>
              <button type="submit" className="btn btn-rouge" disabled={occupe}>{edition.id ? 'Enregistrer' : 'Ajouter'}</button>
            </div>
          </form>
        )}

        <ul className="pcat__liste">
          {catStudios.map((c) => (
            <li key={c.id}>
              <div>
                <strong>{c.nom}</strong>
                <small>{c.description || 'Sans description'} · {c.capacite} pers. · {c.nb_studios} studio(s)</small>
              </div>
              <span className="pcat__actions">
                <button type="button" onClick={() => setEdition(c)}>Modifier</button>
                <button type="button" className="pcat__rouge" onClick={() => setASupprimer({ type: 'studio', element: c })}>Supprimer</button>
              </span>
            </li>
          ))}
          {!catStudios.length && <li className="pcat__vide">Aucune catégorie.</li>}
        </ul>
      </section>

      {/* ---------- Catégories de dépenses ---------- */}
      <section className="pcat__carte">
        <div className="pcat__titre">
          <div><h2>Catégories de dépenses</h2><p>L’ordre est celui de la liste dans « Nouvelle dépense ». Une catégorie masquée n’est plus proposée.</p></div>
        </div>

        <ul className="pcat__liste">
          {catDepenses.map((c, i) => (
            <li key={c.nom} className={c.actif ? '' : 'pcat__masquee'}>
              <span className="pcat__ordre">
                <button type="button" onClick={() => deplacer(i, -1)} disabled={occupe || i === 0} aria-label="Monter">▲</button>
                <button type="button" onClick={() => deplacer(i, 1)} disabled={occupe || i === catDepenses.length - 1} aria-label="Descendre">▼</button>
              </span>
              {renommage?.ancien === c.nom ? (
                <form className="pcat__renommer" onSubmit={renommer}>
                  <input value={renommage.nouveau} autoFocus onChange={(e) => setRenommage((r) => ({ ...r, nouveau: e.target.value }))} aria-label="Nouveau nom" />
                  <button type="submit" className="btn btn-primaire" disabled={occupe || !renommage.nouveau.trim()}>OK</button>
                  <button type="button" className="btn btn-contour" onClick={() => setRenommage(null)}>Annuler</button>
                </form>
              ) : (
                <div>
                  <strong>{c.nom}</strong>
                  <small>{c.nb_depenses} dépense(s){c.actif ? '' : ' · masquée'}</small>
                </div>
              )}
              {renommage?.ancien !== c.nom && (
                <span className="pcat__actions">
                  <button type="button" onClick={() => setRenommage({ ancien: c.nom, nouveau: c.nom })}>Renommer</button>
                  <button type="button" onClick={() => executer(() => modifierCategorieDepense(c.nom, { actif: !c.actif }), c.actif ? 'Catégorie masquée.' : 'Catégorie réaffichée.')} disabled={occupe}>
                    {c.actif ? 'Masquer' : 'Afficher'}
                  </button>
                  {c.nb_depenses === 0 && (
                    <button type="button" className="pcat__rouge" onClick={() => setASupprimer({ type: 'depense', element: c })}>Supprimer</button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>

        <form className="pcat__ajout" onSubmit={ajouterDepense}>
          <input value={nouvelleDepense} onChange={(e) => setNouvelleDepense(e.target.value)} placeholder="Nouvelle catégorie (ex : Gardiennage)" aria-label="Nouvelle catégorie de dépense" />
          <button type="submit" className="btn btn-primaire" disabled={occupe || !nouvelleDepense.trim()}>Ajouter</button>
        </form>
      </section>

      <Confirm
        ouvert={!!aSupprimer}
        titre="Supprimer la catégorie"
        message={aSupprimer && (aSupprimer.type === 'studio'
          ? `Supprimer « ${aSupprimer.element.nom} » ? ${aSupprimer.element.nb_studios ? `Ses ${aSupprimer.element.nb_studios} studio(s) passeront « Sans catégorie ».` : ''}`
          : `Supprimer la catégorie de dépense « ${aSupprimer.element.nom} » ?`)}
        libelle="Supprimer"
        enCours={occupe}
        onConfirmer={supprimer}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  );
}
