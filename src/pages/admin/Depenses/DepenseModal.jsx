import { useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import BrouillonRestaure from '../../../components/BrouillonRestaure/BrouillonRestaure.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useBrouillon } from '../../../hooks/useBrouillon.js';
import { creerDepense, modifierDepense, ajouterCategorieDepense } from '../../../services/depenses.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { versChampJour } from '../../../lib/dates.js';
import './DepenseModal.css';

const NOUVELLE = '__nouvelle__';

// Saisie / modification d'une dépense
export default function DepenseModal({ depense, categories, studios, onFermer, onEnregistre }) {
  const toast = useToast();
  const creation = !depense;
  const [form, setForm, brouillon] = useBrouillon(creation ? 'depense:nouvelle' : `depense:${depense.id}`, () => ({
    date_depense: depense?.date_depense ?? versChampJour(new Date()),
    categorie: depense?.categorie ?? '',
    nouvelleCategorie: '',
    libelle: depense?.libelle ?? '',
    montant: depense ? String(depense.montant) : '',
    studio_id: depense?.studio_id ?? '',
  }));
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);

  const maj = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));
  // Catégorie d'une ancienne dépense qui n'est plus dans la liste : on la garde proposée
  const options = form.categorie && form.categorie !== NOUVELLE && !categories.includes(form.categorie)
    ? [...categories, form.categorie] : categories;

  const valider = () => {
    const e = {};
    if (!form.date_depense) e.date_depense = 'La date est obligatoire.';
    if (!form.categorie) e.categorie = 'Choisissez une catégorie.';
    if (form.categorie === NOUVELLE && !form.nouvelleCategorie.trim()) e.categorie = 'Nommez la nouvelle catégorie.';
    if (!form.libelle.trim()) e.libelle = 'Décrivez la dépense.';
    const m = Number(form.montant);
    if (!Number.isInteger(m) || m <= 0) e.montant = 'Montant invalide (nombre entier en FCFA).';
    setErreurs(e);
    return !Object.keys(e).length;
  };

  const enregistrer = async (ev) => {
    ev.preventDefault();
    if (!valider()) return;
    setEnvoi(true);
    try {
      let categorie = form.categorie;
      if (categorie === NOUVELLE) {
        categorie = form.nouvelleCategorie.trim();
        await ajouterCategorieDepense(categorie);
      }
      const valeurs = {
        date_depense: form.date_depense,
        categorie,
        libelle: form.libelle.trim(),
        montant: Number(form.montant),
        studio_id: form.studio_id || null,
      };
      const d = creation ? await creerDepense(valeurs) : await modifierDepense(depense.id, valeurs);
      brouillon.marquerEnregistre();
      onEnregistre(d);
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const champ = (nom) => `champ ${erreurs[nom] ? 'champ--erreur' : ''}`;

  return (
    <Modal ouvert titre={creation ? 'Nouvelle dépense' : 'Modifier la dépense'} onFermer={envoi ? undefined : onFermer}>
      <form className="depense-modal" onSubmit={enregistrer} noValidate>
        <BrouillonRestaure visible={brouillon.restaure} onEffacer={brouillon.abandonner} />

        <div className="depense-modal__ligne">
          <div className={champ('date_depense')}>
            <label htmlFor="dp-date">Date</label>
            <input id="dp-date" type="date" value={form.date_depense} onChange={maj('date_depense')} />
            {erreurs.date_depense && <small className="champ__erreur">{erreurs.date_depense}</small>}
          </div>
          <div className={champ('montant')}>
            <label htmlFor="dp-montant">Montant (FCFA)</label>
            <input id="dp-montant" type="number" min="1" step="500" inputMode="numeric" value={form.montant} onChange={maj('montant')} autoFocus={creation} />
            {erreurs.montant && <small className="champ__erreur">{erreurs.montant}</small>}
          </div>
        </div>

        <div className={champ('categorie')}>
          <label htmlFor="dp-cat">Catégorie</label>
          <select id="dp-cat" value={form.categorie} onChange={maj('categorie')}>
            <option value="">Choisir…</option>
            {options.map((c) => <option key={c} value={c}>{c}</option>)}
            <option value={NOUVELLE}>+ Nouvelle catégorie…</option>
          </select>
          {form.categorie === NOUVELLE && (
            <input value={form.nouvelleCategorie} onChange={maj('nouvelleCategorie')} placeholder="Ex : Gardiennage" aria-label="Nom de la nouvelle catégorie" autoFocus />
          )}
          {erreurs.categorie && <small className="champ__erreur">{erreurs.categorie}</small>}
        </div>

        <div className={champ('libelle')}>
          <label htmlFor="dp-lib">Libellé</label>
          <input id="dp-lib" value={form.libelle} onChange={maj('libelle')} placeholder="Ex : Facture Senelec octobre, recharge Woyofal…" />
          {erreurs.libelle && <small className="champ__erreur">{erreurs.libelle}</small>}
        </div>

        <div className="champ">
          <label htmlFor="dp-studio">Studio concerné (facultatif)</label>
          <select id="dp-studio" value={form.studio_id} onChange={maj('studio_id')}>
            <option value="">Toute la résidence</option>
            {studios.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.nom}</option>)}
          </select>
        </div>

        <div className="depense-modal__actions">
          <button type="button" className="btn btn-contour" onClick={() => { brouillon.abandonner(); onFermer(); }} disabled={envoi}>Annuler</button>
          <button type="submit" className="btn btn-rouge" disabled={envoi}>{envoi ? 'Enregistrement…' : creation ? 'Enregistrer la dépense' : 'Enregistrer'}</button>
        </div>
      </form>
    </Modal>
  );
}
