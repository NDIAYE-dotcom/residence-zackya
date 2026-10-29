import { useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import BrouillonRestaure from '../../../components/BrouillonRestaure/BrouillonRestaure.jsx';
import { useBrouillon } from '../../../hooks/useBrouillon.js';
import { creerStudio, modifierStudio } from '../../../services/studios.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { STATUTS_STUDIO } from '../../../lib/format.js';
import StudioPhotos from './StudioPhotos.jsx';
import StudioTarifs from './StudioTarifs.jsx';
import './StudioModal.css';

// Équipements proposés en cases à cocher (on peut en ajouter d'autres)
const EQUIPEMENTS = [
  'Climatisation', 'Ventilateur', 'Wifi', 'TV', 'Canal+', 'Cuisine équipée', 'Kitchenette',
  'Réfrigérateur', 'Micro-ondes', 'Eau chaude', 'Machine à laver', 'Fer à repasser',
  'Lit double', 'Bureau', 'Balcon', 'Parking', 'Groupe électrogène', 'Gardiennage 24h/24',
];

const ONGLETS = [
  { id: 'infos', label: 'Informations' },
  { id: 'photos', label: 'Photos' },
  { id: 'tarifs', label: 'Tarifs' },
];

const versFormulaire = (s) => ({
  code: s?.code ?? '',
  nom: s?.nom ?? '',
  categorie_id: s?.categorie_id ?? '',
  etage: s?.etage ?? 0,
  surface_m2: s?.surface_m2 ?? '',
  capacite: s?.capacite ?? 2,
  description: s?.description ?? '',
  equipements: s?.equipements ?? [],
  statut: s?.statut ?? 'disponible',
  publie: s?.publie ?? true,
});

/**
 * Fenêtre d'un studio : Informations / Photos / Tarifs.
 * Pour un nouveau studio, Photos et Tarifs s'ouvrent après le premier enregistrement.
 */
export default function StudioModal({ studio: studioInitial, ongletInitial, categories, studios, onFermer, onChange }) {
  const toast = useToast();
  const [studio, setStudio] = useState(studioInitial);
  const [onglet, setOnglet] = useState(studioInitial ? ongletInitial : 'infos');
  const [form, setForm, brouillon] = useBrouillon(studio ? `studio:${studio.id}` : 'studio:nouveau', () => versFormulaire(studioInitial));
  const [autre, setAutre] = useState('');
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [occupe, setOccupe] = useState(false); // envoi en cours dans Photos / Tarifs

  const maj = (champ) => (e) =>
    setForm((f) => ({ ...f, [champ]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const basculerEquipement = (eq) => setForm((f) => ({
    ...f,
    equipements: f.equipements.includes(eq) ? f.equipements.filter((x) => x !== eq) : [...f.equipements, eq],
  }));

  const ajouterAutre = () => {
    const v = autre.trim();
    if (v && !form.equipements.includes(v)) setForm((f) => ({ ...f, equipements: [...f.equipements, v] }));
    setAutre('');
  };

  // Liste affichée = équipements proposés + ceux ajoutés à la main
  const listeEquipements = [...EQUIPEMENTS, ...form.equipements.filter((e) => !EQUIPEMENTS.includes(e))];

  const valider = () => {
    const e = {};
    if (!form.code.trim()) e.code = 'Le code est obligatoire (ex : S102).';
    else if (form.code.trim().length > 12) e.code = '12 caractères maximum.';
    if (!form.nom.trim()) e.nom = 'Le nom est obligatoire.';
    if (!Number.isInteger(Number(form.capacite)) || Number(form.capacite) < 1) e.capacite = 'Au moins 1 personne.';
    if (form.etage === '' || !Number.isInteger(Number(form.etage))) e.etage = 'Nombre entier (0 = rez-de-chaussée).';
    if (form.surface_m2 !== '' && !(Number(form.surface_m2) > 0)) e.surface_m2 = 'Surface invalide.';
    setErreurs(e);
    return !Object.keys(e).length;
  };

  const enregistrer = async (ev) => {
    ev.preventDefault();
    if (!valider()) return;
    setEnvoi(true);
    const valeurs = {
      code: form.code.trim().toUpperCase(),
      nom: form.nom.trim(),
      categorie_id: form.categorie_id || null,
      etage: Number(form.etage),
      surface_m2: form.surface_m2 === '' ? null : Number(form.surface_m2),
      capacite: Number(form.capacite),
      description: form.description.trim() || null,
      equipements: form.equipements,
      statut: form.statut,
      publie: form.publie,
    };
    try {
      if (studio) {
        const maj = await modifierStudio(studio.id, valeurs);
        brouillon.marquerEnregistre();
        setStudio(maj);
        toast.succes('Informations enregistrées.');
      } else {
        const cree = await creerStudio(valeurs);
        brouillon.marquerEnregistre(); // efface « studio:nouveau » avant de passer à la clé du studio créé
        setStudio(cree);
        setOnglet('tarifs');
        toast.succes(`Studio ${cree.code} créé. Ajoutez maintenant ses tarifs.`);
      }
      onChange();
    } catch (err) {
      if (err.code === '23505') setErreurs({ code: 'Ce code est déjà utilisé par un autre studio.' });
      else toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const champ = (nom) => `champ ${erreurs[nom] ? 'champ--erreur' : ''}`;

  return (
    <Modal
      ouvert
      large
      titre={studio ? `${studio.code} – ${studio.nom}` : 'Nouveau studio'}
      onFermer={envoi || occupe ? undefined : onFermer}
    >
      <div className="studio-modal__onglets" role="tablist">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={onglet === o.id}
            className={`studio-modal__onglet ${onglet === o.id ? 'studio-modal__onglet--actif' : ''}`}
            disabled={!studio && o.id !== 'infos'}
            title={!studio && o.id !== 'infos' ? 'Enregistrez d’abord les informations' : undefined}
            onClick={() => setOnglet(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* ----- Onglet Informations ----- */}
      <form className="studio-modal__form" onSubmit={enregistrer} noValidate hidden={onglet !== 'infos'}>
        <BrouillonRestaure visible={brouillon.restaure} onEffacer={brouillon.abandonner} />
        <div className="studio-modal__ligne studio-modal__ligne--2">
          <div className={champ('code')}>
            <label htmlFor="st-code">Code *</label>
            <input id="st-code" value={form.code} onChange={maj('code')} placeholder="S102" maxLength={12} />
            {erreurs.code && <small className="champ__erreur">{erreurs.code}</small>}
          </div>
          <div className={champ('nom')}>
            <label htmlFor="st-nom">Nom *</label>
            <input id="st-nom" value={form.nom} onChange={maj('nom')} placeholder="Studio Fromager" />
            {erreurs.nom && <small className="champ__erreur">{erreurs.nom}</small>}
          </div>
        </div>

        <div className="studio-modal__ligne studio-modal__ligne--4">
          <div className="champ">
            <label htmlFor="st-cat">Catégorie</label>
            <select id="st-cat" value={form.categorie_id} onChange={maj('categorie_id')}>
              <option value="">Sans catégorie</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div className={champ('capacite')}>
            <label htmlFor="st-cap">Capacité (pers.) *</label>
            <input id="st-cap" type="number" min="1" inputMode="numeric" value={form.capacite} onChange={maj('capacite')} />
            {erreurs.capacite && <small className="champ__erreur">{erreurs.capacite}</small>}
          </div>
          <div className={champ('etage')}>
            <label htmlFor="st-etage">Étage</label>
            <input id="st-etage" type="number" inputMode="numeric" value={form.etage} onChange={maj('etage')} />
            {erreurs.etage && <small className="champ__erreur">{erreurs.etage}</small>}
          </div>
          <div className={champ('surface_m2')}>
            <label htmlFor="st-surf">Surface (m²)</label>
            <input id="st-surf" type="number" min="0" step="0.5" inputMode="decimal" value={form.surface_m2}
              onChange={maj('surface_m2')} placeholder="25" />
            {erreurs.surface_m2 && <small className="champ__erreur">{erreurs.surface_m2}</small>}
          </div>
        </div>

        <div className="champ">
          <label htmlFor="st-desc">Description (visible sur le site)</label>
          <textarea id="st-desc" rows={3} value={form.description} onChange={maj('description')}
            placeholder="Studio lumineux avec kitchenette, proche du centre-ville…" />
        </div>

        <fieldset className="studio-modal__equipements">
          <legend>Équipements</legend>
          <div className="studio-modal__cases">
            {listeEquipements.map((eq) => (
              <label key={eq} className={`studio-modal__case ${form.equipements.includes(eq) ? 'studio-modal__case--coche' : ''}`}>
                <input type="checkbox" checked={form.equipements.includes(eq)} onChange={() => basculerEquipement(eq)} />
                {eq}
              </label>
            ))}
          </div>
          <div className="studio-modal__autre">
            <input value={autre} onChange={(e) => setAutre(e.target.value)} placeholder="Autre équipement…"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouterAutre(); } }}
              aria-label="Autre équipement" />
            <button type="button" className="btn btn-contour" onClick={ajouterAutre} disabled={!autre.trim()}>Ajouter</button>
          </div>
        </fieldset>

        <div className="studio-modal__ligne studio-modal__ligne--2">
          <div className="champ">
            <label htmlFor="st-statut">Statut</label>
            <select id="st-statut" value={form.statut} onChange={maj('statut')}>
              {Object.entries(STATUTS_STUDIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <label className="studio-modal__publie">
            <input type="checkbox" checked={form.publie} onChange={maj('publie')} />
            <span>
              <strong>Publié sur le site</strong>
              <small>Les clients peuvent voir et réserver ce studio.</small>
            </span>
          </label>
        </div>

        <div className="studio-modal__actions">
          <button type="button" className="btn btn-contour" onClick={onFermer} disabled={envoi}>Fermer</button>
          <button type="submit" className="btn btn-rouge" disabled={envoi}>
            {envoi ? 'Enregistrement…' : studio ? 'Enregistrer' : 'Créer le studio'}
          </button>
        </div>
      </form>

      {/* ----- Onglets Photos et Tarifs (gardés en mémoire quand on change d'onglet) ----- */}
      {studio && (
        <>
          <div hidden={onglet !== 'photos'}>
            <StudioPhotos studio={studio} setOccupe={setOccupe}
              onMaj={(s) => { setStudio(s); onChange(); }} />
          </div>
          <div hidden={onglet !== 'tarifs'}>
            <StudioTarifs studio={studio} studios={studios} setOccupe={setOccupe} onEnregistre={onChange} />
          </div>
        </>
      )}
    </Modal>
  );
}
