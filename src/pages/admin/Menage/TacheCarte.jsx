import { formatJourHeure } from '../../../lib/dates.js';
import './TacheCarte.css';

// Prochain client : texte + niveau d'urgence
function prochainClient(iso) {
  if (!iso) return { niveau: 'calme', texte: 'Aucune arrivée prévue' };
  const heures = (new Date(iso) - Date.now()) / 3600000;
  if (heures < 0) return { niveau: 'urgent', texte: 'Client attendu maintenant !' };
  if (heures <= 4) {
    const h = Math.floor(heures);
    const m = Math.round((heures - h) * 60);
    return { niveau: 'urgent', texte: `Prochain client dans ${h ? `${h} h ` : ''}${m} min` };
  }
  const memeJour = new Date(iso).toDateString() === new Date().toDateString();
  return { niveau: memeJour ? 'bientot' : 'calme', texte: `Prochain client : ${formatJourHeure(iso)}` };
}

const duree = (depuis) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(depuis)) / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
};

// Carte d'une tâche de ménage : gros boutons pour le téléphone
export default function TacheCarte({ tache, equipe, moi, peutAssigner, peutSupprimer, occupe, onCommencer, onTerminer, onAssigner, onSupprimer }) {
  const client = prochainClient(tache.prochaine_arrivee);
  const enCours = tache.statut === 'en_cours';

  return (
    <article className={`tache tache--${client.niveau} ${enCours ? 'tache--en-cours' : ''}`}>
      <header className="tache__entete">
        <span className="tache__code">{tache.studio_code}</span>
        <div>
          <strong>{tache.studio_nom}</strong>
          <span className={`tache__statut tache__statut--${tache.statut}`}>{enCours ? 'En cours' : 'À faire'}</span>
        </div>
      </header>

      <p className={`tache__client tache__client--${client.niveau}`}>{client.texte}</p>

      <ul className="tache__infos">
        {tache.notes && <li>📝 {tache.notes}</li>}
        {enCours && tache.commencee_le && <li>⏱ Commencé il y a {duree(tache.commencee_le)}</li>}
        {!tache.reservation_id && <li>Tâche ajoutée à la main</li>}
        {!peutAssigner && (
          <li>{tache.assigne_a ? (tache.assigne_a === moi ? '👤 Assignée à vous' : `👤 ${tache.assigne_nom ?? 'Un collègue'}`) : '👤 Personne pour l’instant'}</li>
        )}
      </ul>

      {peutAssigner && (
        <label className="tache__assigner">
          <span>Assignée à</span>
          <select value={tache.assigne_a ?? ''} onChange={(e) => onAssigner(e.target.value)} disabled={occupe}>
            <option value="">Personne</option>
            {equipe.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            {tache.assigne_a && !equipe.some((p) => p.id === tache.assigne_a) && (
              <option value={tache.assigne_a}>{tache.assigne_nom ?? 'Autre employé'}</option>
            )}
          </select>
        </label>
      )}

      <div className="tache__actions">
        {enCours ? (
          <button type="button" className="btn tache__bouton tache__bouton--fini" onClick={onTerminer} disabled={occupe}>
            {occupe ? '…' : '✓ Terminé'}
          </button>
        ) : (
          <button type="button" className="btn btn-primaire tache__bouton" onClick={onCommencer} disabled={occupe}>
            {occupe ? '…' : 'Commencer'}
          </button>
        )}
        {peutSupprimer && !enCours && (
          <button type="button" className="tache__supprimer" onClick={onSupprimer} disabled={occupe}>Supprimer</button>
        )}
      </div>
    </article>
  );
}
