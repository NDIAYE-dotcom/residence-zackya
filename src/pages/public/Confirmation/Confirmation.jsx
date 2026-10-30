import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { suivreReservation, lireParametres } from '../../../services/public.js';
import { formatFCFA, FORMULES, STATUTS_RESERVATION } from '../../../lib/format.js';
import { formatDuree, formatJourHeure } from '../../../lib/dates.js';
import './Confirmation.css';

// Site public : demande envoyée — référence, récapitulatif, WhatsApp
export default function Confirmation() {
  const { ref } = useParams();
  const { state } = useLocation();
  const reference = ref.toUpperCase();
  // Téléphone : transmis par /reserver, ou gardé pour l'onglet (actualisation de la page)
  const phone = state?.phone ?? (() => { try { return sessionStorage.getItem(`zaquia:suivi:${reference}`); } catch { return null; } })();

  const [resa, setResa] = useState(null);
  const [params, setParams] = useState({});
  const [chargement, setChargement] = useState(!!phone);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    document.title = `Réservation ${reference} · Zaquia Résidence`;
    lireParametres().then(setParams).catch(() => {});
    if (!phone) return;
    suivreReservation(reference, phone).then(setResa).catch(() => setResa(null)).finally(() => setChargement(false));
  }, [reference, phone]);

  const copier = async () => {
    try { await navigator.clipboard.writeText(reference); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* ignoré */ }
  };

  const message = resa
    ? `Bonjour Zaquia Résidence, je viens de réserver sur votre site.\nRéférence : ${reference}\nStudio : ${resa.studio} (${resa.studio_code})\n`
      + `${FORMULES[resa.formule]} du ${formatJourHeure(resa.date_debut)} au ${formatJourHeure(resa.date_fin)}\nMontant : ${formatFCFA(resa.montant_total - resa.remise)}\nMerci de me confirmer.`
    : `Bonjour Zaquia Résidence, je viens de réserver sur votre site (référence ${reference}). Merci de me confirmer.`;
  const whatsapp = params.whatsapp ? `https://wa.me/${params.whatsapp}?text=${encodeURIComponent(message)}` : null;
  const pourcent = Number(params.acompte_pourcent ?? 30);

  return (
    <div className="confirm-page">
      <div className="confirm-page__carte">
        <div className="confirm-page__icone" aria-hidden="true">✓</div>
        <h1>Demande de réservation envoyée !</h1>
        <p className="confirm-page__intro">Merci ! Gardez bien votre référence : elle vous permet de suivre votre réservation.</p>

        <div className="confirm-page__ref">
          <span>Votre référence</span>
          <strong>{reference}</strong>
          <button type="button" onClick={copier}>{copie ? 'Copiée ✓' : 'Copier'}</button>
        </div>

        {chargement ? (
          <p className="confirm-page__info">Chargement du récapitulatif…</p>
        ) : resa && (
          <div className="confirm-page__recap">
            <div className="confirm-page__ligne"><span>Statut</span><span className={`badge badge-${resa.statut}`}>{resa.statut === 'en_attente' ? 'En attente de confirmation' : STATUTS_RESERVATION[resa.statut]}</span></div>
            <div className="confirm-page__ligne"><span>Studio</span><strong>{resa.studio}</strong></div>
            <div className="confirm-page__ligne"><span>{FORMULES[resa.formule]}</span><strong>{formatDuree(resa.date_debut, resa.date_fin)}</strong></div>
            <div className="confirm-page__ligne"><span>Arrivée</span><strong>{formatJourHeure(resa.date_debut)}</strong></div>
            <div className="confirm-page__ligne"><span>Départ</span><strong>{formatJourHeure(resa.date_fin)}</strong></div>
            <div className="confirm-page__ligne confirm-page__total"><span>Montant</span><strong>{formatFCFA(resa.montant_total - resa.remise)}</strong></div>
          </div>
        )}

        <ol className="confirm-page__etapes">
          <li><strong>La réception vérifie votre demande</strong> et vous confirme par WhatsApp ou par téléphone.</li>
          {pourcent > 0 && <li><strong>Un acompte</strong> (environ {pourcent} %) peut vous être demandé : Wave, Orange Money ou espèces.</li>}
          <li><strong>Le jour de votre arrivée</strong>, présentez une pièce d’identité (CNI ou passeport).</li>
        </ol>

        <div className="confirm-page__boutons">
          {whatsapp && <a className="btn btn-rouge" href={whatsapp} target="_blank" rel="noreferrer">Confirmer sur WhatsApp</a>}
          <Link className="btn btn-contour" to={`/suivi?ref=${reference}`}>Suivre ma réservation</Link>
        </div>
        <Link className="confirm-page__accueil" to="/">Retour à l’accueil</Link>
      </div>
    </div>
  );
}
