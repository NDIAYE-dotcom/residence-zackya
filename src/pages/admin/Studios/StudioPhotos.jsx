import { useRef, useState } from 'react';
import { useToast } from '../../../components/Toast/Toast.jsx';
import Confirm from '../../../components/Confirm/Confirm.jsx';
import { envoyerPhoto, enregistrerPhotos, supprimerFichiersPhotos } from '../../../services/studios.js';
import { compresserImage } from '../../../lib/images.js';
import { messageErreur } from '../../../lib/erreurs.js';
import './StudioPhotos.css';

const MAX_PHOTOS = 12;

// Onglet Photos : envoi multiple, photo de couverture (= la 1re), suppression
export default function StudioPhotos({ studio, onMaj, setOccupe }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [envoi, setEnvoi] = useState(null); // { fait, total }
  const [travail, setTravail] = useState(false); // couverture / suppression en cours
  const [aSupprimer, setASupprimer] = useState(null);
  const photos = studio.photos ?? [];
  const occupe = !!envoi || travail;

  const ajouter = async (e) => {
    const fichiers = Array.from(e.target.files ?? []);
    e.target.value = ''; // permet de re-choisir les mêmes fichiers
    if (!fichiers.length) return;
    if (photos.length + fichiers.length > MAX_PHOTOS) {
      return toast.erreur(`${MAX_PHOTOS} photos maximum par studio (il en reste ${MAX_PHOTOS - photos.length}).`);
    }

    setOccupe(true);
    const nouvelles = [];
    for (const [i, fichier] of fichiers.entries()) {
      setEnvoi({ fait: i + 1, total: fichiers.length });
      try {
        nouvelles.push(await envoyerPhoto(studio.id, await compresserImage(fichier)));
      } catch (err) {
        toast.erreur(`${fichier.name} : ${messageErreur(err)}`);
      }
    }

    if (nouvelles.length) {
      try {
        onMaj(await enregistrerPhotos(studio.id, [...photos, ...nouvelles]));
        toast.succes(`${nouvelles.length} photo(s) ajoutée(s).`);
      } catch (err) {
        await supprimerFichiersPhotos(nouvelles); // évite des fichiers orphelins
        toast.erreur(messageErreur(err));
      }
    }
    setEnvoi(null);
    setOccupe(false);
  };

  const mettreEnCouverture = async (url) => {
    setTravail(true);
    try {
      onMaj(await enregistrerPhotos(studio.id, [url, ...photos.filter((p) => p !== url)]));
      toast.succes('Photo de couverture modifiée.');
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setTravail(false);
    }
  };

  const supprimer = async () => {
    setTravail(true);
    try {
      onMaj(await enregistrerPhotos(studio.id, photos.filter((p) => p !== aSupprimer)));
      await supprimerFichiersPhotos([aSupprimer]);
      toast.succes('Photo supprimée.');
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setTravail(false);
      setASupprimer(null);
    }
  };

  return (
    <div className="photos">
      <div className="photos__entete">
        <p>
          {photos.length} / {MAX_PHOTOS} photos. La <strong>première</strong> est la photo de couverture sur le site.
          Les photos sont réduites automatiquement avant l’envoi.
        </p>
        <button type="button" className="btn btn-primaire" onClick={() => inputRef.current?.click()}
          disabled={occupe || photos.length >= MAX_PHOTOS}>
          {envoi ? `Envoi ${envoi.fait} / ${envoi.total}…` : '+ Ajouter des photos'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={ajouter} />
      </div>

      {!photos.length ? (
        <button type="button" className="photos__vide" onClick={() => inputRef.current?.click()} disabled={occupe}>
          <strong>Aucune photo pour ce studio</strong>
          <span>Cliquez ici pour ajouter des photos (JPG, PNG ou WEBP).</span>
        </button>
      ) : (
        <div className="photos__grille">
          {photos.map((url, i) => (
            <figure key={url} className="photos__item">
              <img src={url} alt={`${studio.nom} – photo ${i + 1}`} loading="lazy" />
              {i === 0 && <span className="photos__couverture">Couverture</span>}
              <figcaption className="photos__actions">
                {i > 0 && (
                  <button type="button" onClick={() => mettreEnCouverture(url)} disabled={occupe}>
                    Mettre en couverture
                  </button>
                )}
                <button type="button" className="photos__supprimer" onClick={() => setASupprimer(url)} disabled={occupe}>
                  Supprimer
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <Confirm
        ouvert={!!aSupprimer}
        titre="Supprimer la photo"
        message="Cette photo sera définitivement supprimée."
        libelle="Supprimer"
        enCours={travail}
        onConfirmer={supprimer}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  );
}
