import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { statutParReference, suivreReservation, lireParametres, REFERENCE_VALIDE } from '../../../services/public.js';
import { useActualisationAuto } from '../../../hooks/useActualisationAuto.js';
import { formatFCFA, FORMULES, STATUTS_RESERVATION } from '../../../lib/format.js';
import { formatDuree, formatJourHeure } from '../../../lib/dates.js';
import { normaliserTelephone } from '../../../lib/telephone.js';
import { normaliserReference } from '../../../lib/reference.js';
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

const telephoneMemorise = (ref) => { try { return sessionStorage.getItem(`zaquia:suivi:${ref}`); } catch { return null; } };
const memoriserTelephone = (ref, tel) => { try { sessionStorage.setItem(`zaquia:suivi:${ref}`, tel); } catch { /* ignoré */ } };

// Site public : la référence suffit pour voir le statut ; le téléphone débloque le détail du paiement
export default function Suivi() {
  const [params, setParams] = useSearchParams();
  const [saisie, setSaisie] = useState(params.get('ref') ?? '');
  const [statut, setStatut] = useState(null);   // infos sans données personnelles
  const [detail, setDetail] = useState(null);   // infos complètes (avec téléphone)
  const [telephone, setTelephone] = useState('');
  const [etat, setEtat] = useState('attente');  // attente | recherche | trouve | introuvable | erreur
  const [erreurTel, setErreurTel] = useState('');
  const [nouvelle, setNouvelle] = useState('');
  const [majLe, setMajLe] = useState(null);
  const [coordonnees, setCoordonnees] = useState({});

  const reference = normaliserReference(saisie);
  const valide = REFERENCE_VALIDE.test(reference);

  useEffect(() => {
    document.title = 'Suivre ma réservation · Zaquia Résidence';
    lireParametres().then(setCoordonnees).catch(() => {});
  }, []);

  // Recherche automatique dès qu'une référence complète est saisie ou collée
  useEffect(() => {
    if (!valide) { setEtat('attente'); setStatut(null); setDetail(null); return undefined; }
    let annule = false;
    setEtat('recherche');
    setNouvelle('');
    const t = setTimeout(async () => {
      try {
        const s = await statutParReference(reference);
        if (annule) return;
        if (!s) { setEtat('introuvable'); setStatut(null); setDetail(null); return; }
        setStatut(s);
        setEtat('trouve');
        setMajLe(new Date());
        setParams({ ref: reference }, { replace: true }); // lien partageable, page actualisable
        // Même appareil que la réservation : le détail s'affiche directement
        const tel = telephoneMemorise(reference);
        setDetail(tel ? await suivreReservation(reference, tel).catch(() => null) : null);
      } catch {
        if (!annule) setEtat('erreur');
      }
    }, 350);
    return () => { annule = true; clearTimeout(t); };
  }, [reference, valide]); // setParams : référence stable, inutile de relancer la recherche

  // Mise à jour automatique (15 s + retour sur l'onglet)
  useActualisationAuto(async () => {
    try {
      const tel = detail ? telephoneMemorise(reference) : null;
      const nouveau = tel ? await suivreReservation(reference, tel) : await statutParReference(reference);
      if (!nouveau) return;
      if (statut && nouveau.statut !== statut.statut) setNouvelle(NOUVELLES[nouveau.statut] ?? 'Votre réservation a été mise à jour.');
      setStatut((s) => ({ ...s, ...nouveau }));
      if (tel) setDetail(nouveau);
      setMajLe(new Date());
    } catch { /* réseau coupé : prochain essai dans 15 s */ }
  }, 15000, etat === 'trouve');

  const afficherDetail = async (e) => {
    e.preventDefault();
    const tel = normaliserTelephone(telephone);
    if (!tel) return setErreurTel('Indiquez le numéro sénégalais utilisé pour réserver.');
    setErreurTel('');
    const d = await suivreReservation(reference, tel).catch(() => null);
    if (!d) return setErreurTel('Ce numéro ne correspond pas à cette réservation.');
    memoriserTelephone(reference, tel);
    setDetail(d);
  };

  const s = statut;
  const annulee = s && ['annulee', 'no_show'].includes(s.statut);
  const rang = s ? ETAPES.findIndex((x) => x.statut === s.statut) : -1;
  const net = detail ? detail.montant_total - detail.remise : 0;
  const reste = detail ? Math.max(0, net - detail.total_paye) : 0;
  const whatsapp = coordonnees.whatsapp
    ? `https://wa.me/${coordonnees.whatsapp}?text=${encodeURIComponent(`Bonjour, j’ai une question sur ma réservation ${valide ? reference : ''}.`)}`
    : null;

  return (
    <div className="suivi">
      <header className="suivi__entete">
        <h1>Suivre ma réservation</h1>
        <p>Collez ou tapez votre référence : le statut s’affiche automatiquement.</p>
      </header>

      <div className="suivi__recherche">
        <label htmlFor="sv-ref">Référence de réservation</label>
        <input id="sv-ref" value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="ZQ-261031-0012"
          autoComplete="off" autoCapitalize="characters" spellCheck="false" autoFocus={!saisie} />
        <small className={`suivi__indice suivi__indice--${etat}`}>
          {etat === 'recherche' ? 'Recherche…'
            : etat === 'introuvable' ? 'Aucune réservation avec cette référence. Vérifiez-la (ex : ZQ-261031-0012).'
              : etat === 'erreur' ? 'Recherche impossible pour le moment. Réessayez dans un instant.'
                : etat === 'trouve' ? '✓ Réservation trouvée'
                  : 'La référence figure sur votre page de confirmation (ZQ-…).'}
        </small>
      </div>

      {etat === 'introuvable' && whatsapp && (
        <a className="btn btn-contour suivi__aide" href={whatsapp} target="_blank" rel="noreferrer">Besoin d’aide ? Écrire sur WhatsApp</a>
      )}

      {s && etat === 'trouve' && (
        <section className="suivi__resultat">
          {nouvelle && <p className="suivi__nouvelle" role="status">{nouvelle}</p>}

          <div className="suivi__titre">
            <strong>{s.reference}</strong>
            <span className={`badge badge-${s.statut}`}>{s.statut === 'en_attente' ? 'En attente de confirmation' : STATUTS_RESERVATION[s.statut]}</span>
          </div>

          {annulee ? (
            <p className="suivi__annulee">Cette réservation a été {s.statut === 'annulee' ? 'annulée' : 'clôturée (non présentation)'}. Pour toute question, contactez la réception.</p>
          ) : (
            <ol className="suivi__frise">
              {ETAPES.map((x, i) => (
                <li key={x.statut} className={i < rang ? 'suivi__etape--faite' : i === rang ? 'suivi__etape--actuelle' : ''}>
                  <span aria-hidden="true">{i < rang ? '✓' : i + 1}</span>{x.libelle}
                </li>
              ))}
            </ol>
          )}

          <div className="suivi__details">
            <div><span>Studio</span><strong><Link to={`/studios/${s.studio_id}`}>{s.studio}</Link></strong></div>
            <div><span>Formule</span><strong>{FORMULES[s.formule]} · {formatDuree(s.date_debut, s.date_fin)}</strong></div>
            <div><span>Arrivée</span><strong>{formatJourHeure(s.date_debut)}</strong></div>
            <div><span>Départ</span><strong>{formatJourHeure(s.date_fin)}</strong></div>
            {detail && <div><span>Personnes</span><strong>{detail.nb_personnes}</strong></div>}
          </div>

          {detail ? (
            <div className="suivi__argent">
              <div><span>Montant</span><strong>{formatFCFA(net)}</strong></div>
              <div><span>Déjà payé</span><strong>{formatFCFA(detail.total_paye)}</strong></div>
              {!annulee && <div className={reste > 0 ? 'suivi__reste' : 'suivi__solde'}><span>{reste > 0 ? 'Reste à payer' : 'Soldé'}</span><strong>{formatFCFA(reste)}</strong></div>}
            </div>
          ) : (
            <form className="suivi__deverrouiller" onSubmit={afficherDetail} noValidate>
              <p>🔒 Pour voir le <strong>montant et vos paiements</strong>, confirmez votre téléphone :</p>
              <div>
                <input type="tel" inputMode="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="77 123 45 67" aria-label="Téléphone utilisé pour réserver" />
                <button type="submit" className="btn btn-primaire">Afficher</button>
              </div>
              {erreurTel && <small className="champ__erreur">{erreurTel}</small>}
            </form>
          )}

          {whatsapp && <a className="btn btn-contour suivi__contact" href={whatsapp} target="_blank" rel="noreferrer">Une question ? Écrire sur WhatsApp</a>}
          {majLe && (
            <p className="suivi__auto"><span aria-hidden="true" />Mise à jour automatique · vérifié à {majLe.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
          )}
        </section>
      )}
    </div>
  );
}
