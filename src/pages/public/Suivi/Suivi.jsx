import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { suivreReservation, lireParametres } from '../../../services/public.js';
import { useActualisationAuto } from '../../../hooks/useActualisationAuto.js';
import { formatFCFA, FORMULES, STATUTS_RESERVATION } from '../../../lib/format.js';
import { formatDuree, formatJourHeure } from '../../../lib/dates.js';
import { normaliserTelephone } from '../../../lib/telephone.js';
import './Suivi.css';

// Message affiché quand le statut change pendant que la page est ouverte
const NOUVELLES = {
  confirmee: 'Bonne nouvelle : votre réservation est confirmée !',
  en_cours: 'Bienvenue ! Votre séjour a commencé.',
  terminee: 'Merci pour votre séjour, à bientôt !',
  annulee: 'Votre réservation a été annulée. Contactez la réception pour toute question.',
  no_show: 'Votre réservation a été clôturée. Contactez la réception pour toute question.',
};

const ETAPES = [
  { statut: 'en_attente', libelle: 'Demande reçue' },
  { statut: 'confirmee', libelle: 'Confirmée' },
  { statut: 'en_cours', libelle: 'Séjour en cours' },
  { statut: 'terminee', libelle: 'Terminée' },
];

// Site public : le client retrouve sa réservation (référence + téléphone)
export default function Suivi() {
  const [params] = useSearchParams();
  const [reference, setReference] = useState((params.get('ref') ?? '').toUpperCase());
  const [telephone, setTelephone] = useState('');
  const [resa, setResa] = useState(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState(false);
  const [coordonnees, setCoordonnees] = useState({});
  const [suivie, setSuivie] = useState(null); // { ref, phone } de la réservation affichée
  const [nouvelle, setNouvelle] = useState(''); // changement de statut détecté
  const [majLe, setMajLe] = useState(null);

  useEffect(() => {
    document.title = 'Suivre ma réservation · Zaquia Résidence';
    lireParametres().then(setCoordonnees).catch(() => {});
    // Retour depuis la confirmation : le téléphone est déjà connu dans cet onglet
    const ref = (params.get('ref') ?? '').toUpperCase();
    try {
      const tel = ref && sessionStorage.getItem(`zaquia:suivi:${ref}`);
      if (tel) { setTelephone(tel.replace('+221', '')); chercher(ref, tel); }
    } catch { /* navigation privée */ }
  }, []);

  async function chercher(ref, phone) {
    setRecherche(true);
    setErreur('');
    setIntrouvable(false);
    try {
      const r = await suivreReservation(ref.trim().toUpperCase(), phone);
      setResa(r);
      setIntrouvable(!r);
      setSuivie(r ? { ref: r.reference, phone } : null);
      setNouvelle('');
      setMajLe(new Date());
    } catch {
      setErreur('Recherche impossible pour le moment. Réessayez dans un instant.');
    } finally {
      setRecherche(false);
    }
  }

  // Revérifie toute seule la réservation affichée (toutes les 15 s et au retour sur l'onglet)
  useActualisationAuto(async () => {
    try {
      const r = await suivreReservation(suivie.ref, suivie.phone);
      if (!r) return;
      setResa((avant) => {
        if (avant && avant.statut !== r.statut) setNouvelle(NOUVELLES[r.statut] ?? 'Votre réservation a été mise à jour.');
        return r;
      });
      setMajLe(new Date());
    } catch { /* réseau coupé : on réessaiera au prochain passage */ }
  }, 15000, !!suivie);

  const valider = (e) => {
    e.preventDefault();
    const phone = normaliserTelephone(telephone);
    if (!reference.trim()) return setErreur('Indiquez votre référence (ex : ZQ-261031-0012).');
    if (!phone) return setErreur('Indiquez le numéro sénégalais utilisé pour réserver.');
    chercher(reference, phone);
  };

  const annulee = resa && ['annulee', 'no_show'].includes(resa.statut);
  const rang = resa ? ETAPES.findIndex((e) => e.statut === resa.statut) : -1;
  const net = resa ? resa.montant_total - resa.remise : 0;
  const reste = resa ? Math.max(0, net - resa.total_paye) : 0;
  const whatsapp = coordonnees.whatsapp
    ? `https://wa.me/${coordonnees.whatsapp}?text=${encodeURIComponent(`Bonjour, j’ai une question sur ma réservation ${resa?.reference ?? reference}.`)}`
    : null;

  return (
    <div className="suivi">
      <header className="suivi__entete">
        <h1>Suivre ma réservation</h1>
        <p>Saisissez la référence reçue à la réservation et votre numéro de téléphone.</p>
      </header>

      <form className="suivi__formulaire" onSubmit={valider} noValidate>
        <div className="champ">
          <label htmlFor="sv-ref">Référence</label>
          <input id="sv-ref" value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder="ZQ-261031-0012" autoComplete="off" />
        </div>
        <div className="champ">
          <label htmlFor="sv-tel">Téléphone</label>
          <input id="sv-tel" type="tel" inputMode="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="77 123 45 67" />
        </div>
        <button type="submit" className="btn btn-rouge" disabled={recherche}>{recherche ? 'Recherche…' : 'Rechercher'}</button>
        {erreur && <p className="suivi__erreur">{erreur}</p>}
      </form>

      {introuvable && (
        <div className="suivi__message">
          <p>Aucune réservation ne correspond à cette référence et ce numéro. Vérifiez-les, ou contactez la réception.</p>
          {whatsapp && <a className="btn btn-contour" href={whatsapp} target="_blank" rel="noreferrer">Contacter sur WhatsApp</a>}
        </div>
      )}

      {resa && (
        <section className="suivi__resultat">
          {nouvelle && <p className="suivi__nouvelle" role="status">{nouvelle}</p>}
          <div className="suivi__titre">
            <strong>{resa.reference}</strong>
            <span className={`badge badge-${resa.statut}`}>{resa.statut === 'en_attente' ? 'En attente de confirmation' : STATUTS_RESERVATION[resa.statut]}</span>
          </div>

          {annulee ? (
            <p className="suivi__annulee">Cette réservation a été {resa.statut === 'annulee' ? 'annulée' : 'clôturée (non présentation)'}. Pour toute question, contactez la réception.</p>
          ) : (
            <ol className="suivi__frise">
              {ETAPES.map((e, i) => (
                <li key={e.statut} className={i < rang ? 'suivi__etape--faite' : i === rang ? 'suivi__etape--actuelle' : ''}>
                  <span aria-hidden="true">{i < rang ? '✓' : i + 1}</span>{e.libelle}
                </li>
              ))}
            </ol>
          )}

          <div className="suivi__details">
            <div><span>Studio</span><strong><Link to={`/studios/${resa.studio_id}`}>{resa.studio}</Link></strong></div>
            <div><span>Formule</span><strong>{FORMULES[resa.formule]} · {formatDuree(resa.date_debut, resa.date_fin)}</strong></div>
            <div><span>Arrivée</span><strong>{formatJourHeure(resa.date_debut)}</strong></div>
            <div><span>Départ</span><strong>{formatJourHeure(resa.date_fin)}</strong></div>
            <div><span>Personnes</span><strong>{resa.nb_personnes}</strong></div>
          </div>

          <div className="suivi__argent">
            <div><span>Montant</span><strong>{formatFCFA(net)}</strong></div>
            <div><span>Déjà payé</span><strong>{formatFCFA(resa.total_paye)}</strong></div>
            {!annulee && <div className={reste > 0 ? 'suivi__reste' : 'suivi__solde'}><span>{reste > 0 ? 'Reste à payer' : 'Soldé'}</span><strong>{formatFCFA(reste)}</strong></div>}
          </div>

          {whatsapp && <a className="btn btn-contour suivi__contact" href={whatsapp} target="_blank" rel="noreferrer">Une question ? Écrire sur WhatsApp</a>}
          {majLe && (
            <p className="suivi__auto"><span aria-hidden="true" />Mise à jour automatique · vérifié à {majLe.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
          )}
        </section>
      )}
    </div>
  );
}
