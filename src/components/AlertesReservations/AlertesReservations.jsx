import { Link } from 'react-router-dom';
import { formatFCFA, FORMULES } from '../../lib/format.js';
import { formatJourHeure } from '../../lib/dates.js';
import './AlertesReservations.css';

// Cartes « Nouvelle réservation en ligne » (en haut à droite de l'administration)
export default function AlertesReservations({ alertes, onFermer }) {
  if (!alertes.length) return null;
  return (
    <div className="alertes" role="region" aria-label="Nouvelles réservations" aria-live="assertive">
      {alertes.map((a) => (
        <article key={a.id} className="alerte">
          <header>
            <span className="alerte__icone" aria-hidden="true">🔔</span>
            <strong>Nouvelle réservation en ligne</strong>
            <button type="button" className="alerte__fermer" onClick={() => onFermer(a.id)} aria-label="Fermer l’alerte">×</button>
          </header>
          <p className="alerte__client">{a.client_nom ?? 'Client'} <span>· {a.reference}</span></p>
          {a.studio_code && (
            <p className="alerte__detail">
              {a.studio_code} – {a.studio_nom} · {FORMULES[a.formule]}<br />
              {formatJourHeure(a.date_debut)} → {formatJourHeure(a.date_fin)}
            </p>
          )}
          <footer>
            {a.montant_total != null && <strong>{formatFCFA(a.montant_total - (a.remise ?? 0))}</strong>}
            <Link className="btn btn-rouge" to={`/admin/reservations/${a.id}`} onClick={() => onFermer(a.id)}>Ouvrir</Link>
          </footer>
        </article>
      ))}
    </div>
  );
}
