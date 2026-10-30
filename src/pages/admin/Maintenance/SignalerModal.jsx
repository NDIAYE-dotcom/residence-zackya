import { useRef, useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import BrouillonRestaure from '../../../components/BrouillonRestaure/BrouillonRestaure.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useBrouillon } from '../../../hooks/useBrouillon.js';
import { signalerPanne, envoyerPhotoPanne, supprimerPhotosPanne } from '../../../services/maintenance.js';
import { compresserImage } from '../../../lib/images.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { PRIORITES } from '../../../lib/format.js';
import './SignalerModal.css';

const MAX_PHOTOS = 4;
const AIDE_PRIORITE = {
  urgente: 'Studio inutilisable : il passe en maintenance',
  haute: 'À réparer aujourd’hui',
  normale: 'À réparer cette semaine',
  basse: 'Peut attendre',
};

// Signaler une panne (photos prises avec le téléphone, compressées avant l'envoi)
export default function SignalerModal({ studios, onFermer, onSignale }) {
  const toast = useToast();
  const entree = useRef(null);
  const [form, setForm, brouillon] = useBrouillon('panne:nouvelle', { studioId: '', titre: '', description: '', priorite: 'normale' });
  const [photos, setPhotos] = useState([]); // [{ fichier, apercu }] — jamais en brouillon
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);

  const maj = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  const ajouterPhotos = (e) => {
    const fichiers = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length);
    e.target.value = '';
    setPhotos((ps) => [...ps, ...fichiers.map((fichier) => ({ fichier, apercu: URL.createObjectURL(fichier) }))]);
  };
  const retirerPhoto = (i) => setPhotos((ps) => { URL.revokeObjectURL(ps[i].apercu); return ps.filter((_, j) => j !== i); });

  const valider = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!form.studioId) e.studioId = 'Choisissez le studio.';
    if (!form.titre.trim()) e.titre = 'Décrivez la panne en quelques mots.';
    setErreurs(e);
    if (Object.keys(e).length) return;

    setEnvoi(true);
    const urls = [];
    try {
      for (const p of photos) urls.push(await envoyerPhotoPanne(form.studioId, await compresserImage(p.fichier)));
      const panne = await signalerPanne({ ...form, titre: form.titre.trim(), description: form.description.trim(), photos: urls });
      brouillon.marquerEnregistre();
      photos.forEach((p) => URL.revokeObjectURL(p.apercu));
      onSignale(panne);
    } catch (err) {
      await supprimerPhotosPanne(urls).catch(() => {}); // pas de photos orphelines
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal ouvert titre="Signaler une panne" onFermer={envoi ? undefined : onFermer}>
      <form className="signaler" onSubmit={valider} noValidate>
        <BrouillonRestaure visible={brouillon.restaure} onEffacer={brouillon.abandonner} />

        <div className={`champ ${erreurs.studioId ? 'champ--erreur' : ''}`}>
          <label htmlFor="sg-studio">Studio</label>
          <select id="sg-studio" value={form.studioId} onChange={maj('studioId')}>
            <option value="">Choisir…</option>
            {studios.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.nom}</option>)}
          </select>
          {erreurs.studioId && <small className="champ__erreur">{erreurs.studioId}</small>}
        </div>

        <div className={`champ ${erreurs.titre ? 'champ--erreur' : ''}`}>
          <label htmlFor="sg-titre">Quel est le problème ?</label>
          <input id="sg-titre" value={form.titre} onChange={maj('titre')} placeholder="Ex : la clim ne refroidit plus" maxLength={120} />
          {erreurs.titre && <small className="champ__erreur">{erreurs.titre}</small>}
        </div>

        <div className="champ">
          <label htmlFor="sg-desc">Détails (facultatif)</label>
          <textarea id="sg-desc" rows={2} value={form.description} onChange={maj('description')} placeholder="Depuis quand, bruit, fuite…" />
        </div>

        <fieldset className="signaler__priorites">
          <legend>Priorité</legend>
          {Object.entries(PRIORITES).map(([k, v]) => (
            <label key={k} className={`signaler__priorite signaler__priorite--${k} ${form.priorite === k ? 'signaler__priorite--choisie' : ''}`}>
              <input type="radio" name="priorite" value={k} checked={form.priorite === k} onChange={maj('priorite')} />
              <strong>{v}</strong>
              <small>{AIDE_PRIORITE[k]}</small>
            </label>
          ))}
        </fieldset>

        <div className="signaler__photos">
          {photos.map((p, i) => (
            <span key={p.apercu} className="signaler__vignette">
              <img src={p.apercu} alt={`Photo ${i + 1}`} />
              <button type="button" onClick={() => retirerPhoto(i)} aria-label="Retirer la photo">×</button>
            </span>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" className="signaler__ajout" onClick={() => entree.current?.click()}>
              📷<span>Photo</span>
            </button>
          )}
          {/* capture : ouvre directement l'appareil photo sur téléphone */}
          <input ref={entree} type="file" accept="image/*" capture="environment" multiple hidden onChange={ajouterPhotos} />
        </div>

        <div className="signaler__actions">
          <button type="button" className="btn btn-contour" onClick={() => { brouillon.abandonner(); onFermer(); }} disabled={envoi}>Annuler</button>
          <button type="submit" className="btn btn-rouge" disabled={envoi}>{envoi ? 'Envoi…' : 'Signaler'}</button>
        </div>
      </form>
    </Modal>
  );
}
