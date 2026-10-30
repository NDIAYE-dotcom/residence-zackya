import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import Confirm from '../../../components/Confirm/Confirm.jsx';
import {
  listerTaches, personnelMenage, commencerTache, terminerTache, assignerTache, supprimerTache, abonnerMenage,
} from '../../../services/menage.js';
import { messageErreur } from '../../../lib/erreurs.js';
import TacheCarte from './TacheCarte.jsx';
import NouvelleTacheModal from './NouvelleTacheModal.jsx';
import './Menage.css';

// Ordre d'urgence : client qui arrive le plus tôt d'abord, puis tâches les plus anciennes
const parUrgence = (a, b) => {
  const pa = a.prochaine_arrivee ? new Date(a.prochaine_arrivee).getTime() : Infinity;
  const pb = b.prochaine_arrivee ? new Date(b.prochaine_arrivee).getTime() : Infinity;
  return pa - pb || new Date(a.created_at) - new Date(b.created_at);
};

// Module « Ménage » (tout le personnel) — conçu pour le téléphone
export default function Menage() {
  const { profile } = useAuth();
  const toast = useToast();
  const estMenage = profile?.role === 'menage';
  const peutAssigner = ['admin', 'gerant', 'receptionniste'].includes(profile?.role);
  const peutSupprimer = ['admin', 'gerant'].includes(profile?.role);

  const [taches, setTaches] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [filtre, setFiltre] = useState(estMenage ? 'mes' : 'toutes');
  const [connexion, setConnexion] = useState('connexion');
  const [enCours, setEnCours] = useState(null); // id de la tâche en cours d'enregistrement
  const [nouvelle, setNouvelle] = useState(false);
  const [aSupprimer, setASupprimer] = useState(null);

  const charger = useCallback(async () => {
    setErreur('');
    try {
      const [t, e] = await Promise.all([listerTaches(), personnelMenage()]);
      setTaches(t);
      setEquipe(e);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger les tâches de ménage.'));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  // Temps réel (rechargement groupé)
  const minuteur = useRef(null);
  useEffect(() => abonnerMenage(() => {
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(charger, 400);
  }, (statut) => {
    if (statut === 'SUBSCRIBED') setConnexion('actif');
    else if (['CHANNEL_ERROR', 'TIMED_OUT'].includes(statut)) setConnexion('erreur');
  }), [charger]);

  const actives = useMemo(() => taches
    .filter((t) => t.statut !== 'terminee' && (filtre === 'toutes' || t.assigne_a === profile?.id || (filtre === 'mes' && !t.assigne_a)))
    .sort((a, b) => (b.statut === 'en_cours') - (a.statut === 'en_cours') || parUrgence(a, b)), // en cours d'abord
  [taches, filtre, profile?.id]);
  const terminees = taches.filter((t) => t.statut === 'terminee').sort((a, b) => new Date(b.terminee_le) - new Date(a.terminee_le));
  const mesTaches = taches.filter((t) => t.statut !== 'terminee' && t.assigne_a === profile?.id).length;

  const agir = async (tache, fn, message) => {
    setEnCours(tache.id);
    try {
      await fn();
      toast.succes(message);
      await charger();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnCours(null);
    }
  };

  const supprimer = async () => {
    await agir(aSupprimer, () => supprimerTache(aSupprimer), 'Tâche supprimée.');
    setASupprimer(null);
  };

  return (
    <div className="menage">
      <header className="menage__entete">
        <div>
          <h1>Ménage</h1>
          <p className={`menage__direct menage__direct--${connexion}`}>
            <span aria-hidden="true" />
            {connexion === 'actif' ? 'Mise à jour automatique' : connexion === 'erreur' ? 'Hors ligne : actualisez la page' : 'Connexion…'}
          </p>
        </div>
        <button className="btn btn-rouge" onClick={() => setNouvelle(true)}>+ Tâche</button>
      </header>

      <div className="menage__filtres" role="tablist" aria-label="Filtre">
        <button type="button" role="tab" aria-selected={filtre === 'mes'} className={filtre === 'mes' ? 'menage__filtre--actif' : ''}
          onClick={() => setFiltre('mes')}>
          Mes tâches{mesTaches ? ` (${mesTaches})` : ''}
        </button>
        <button type="button" role="tab" aria-selected={filtre === 'toutes'} className={filtre === 'toutes' ? 'menage__filtre--actif' : ''}
          onClick={() => setFiltre('toutes')}>
          Toutes ({taches.filter((t) => t.statut !== 'terminee').length})
        </button>
      </div>
      {filtre === 'mes' && <p className="menage__aide">Vos tâches et celles qui ne sont encore assignées à personne.</p>}

      {chargement ? (
        <div className="menage__etat">Chargement…</div>
      ) : erreur ? (
        <div className="menage__etat menage__etat--erreur">
          <p>{erreur}</p>
          <button className="btn btn-contour" onClick={charger}>Réessayer</button>
        </div>
      ) : (
        <>
          {!actives.length ? (
            <div className="menage__etat menage__etat--ok">
              <strong>Tout est propre ✨</strong>
              <p>Aucun studio à nettoyer pour le moment. Les tâches apparaissent ici automatiquement après chaque départ.</p>
            </div>
          ) : (
            <div className="menage__liste">
              {actives.map((t) => (
                <TacheCarte key={t.id} tache={t} equipe={equipe} moi={profile?.id}
                  peutAssigner={peutAssigner} peutSupprimer={peutSupprimer} occupe={enCours === t.id}
                  onCommencer={() => agir(t, () => commencerTache(t, profile?.id), `${t.studio_code} : ménage commencé.`)}
                  onTerminer={() => agir(t, () => terminerTache(t), `${t.studio_code} est propre !`)}
                  onAssigner={(id) => agir(t, () => assignerTache(t, id), id ? 'Tâche assignée.' : 'Assignation retirée.')}
                  onSupprimer={() => setASupprimer(t)} />
              ))}
            </div>
          )}

          {terminees.length > 0 && (
            <details className="menage__terminees">
              <summary>Terminées aujourd’hui ({terminees.length})</summary>
              <ul>
                {terminees.map((t) => (
                  <li key={t.id}>
                    <strong>{t.studio_code}</strong>
                    <span>{t.studio_nom}</span>
                    <small>
                      {new Date(t.terminee_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {t.terminee_par_nom ? ` · ${t.terminee_par_nom}` : ''}
                    </small>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {nouvelle && (
        <NouvelleTacheModal equipe={equipe} peutAssigner={peutAssigner}
          onFermer={() => setNouvelle(false)}
          onCree={() => { toast.succes('Tâche ajoutée.'); setNouvelle(false); charger(); }} />
      )}

      <Confirm
        ouvert={!!aSupprimer}
        titre="Supprimer la tâche"
        message={aSupprimer && `Supprimer la tâche de ménage de ${aSupprimer.studio_code} ?`}
        libelle="Supprimer"
        enCours={!!enCours}
        onConfirmer={supprimer}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  );
}
