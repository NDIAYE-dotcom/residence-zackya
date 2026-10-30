import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useBrouillon } from '../../../hooks/useBrouillon.js';
import { studioPublic, lireParametres, verifierSejour, creerReservationPublique } from '../../../services/public.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, FORMULES, UNITES_FORMULE, UNITES_FORMULE_PLURIEL } from '../../../lib/format.js';
import { calculerFin, debutParDefaut, formatDuree, formatJourHeure, versChampDate } from '../../../lib/dates.js';
import { normaliserTelephone } from '../../../lib/telephone.js';
import './Reserver.css';

const ORDRE = Object.keys(FORMULES);
const COORDONNEES_VIDES = { nom: '', telephone: '', email: '', nbPersonnes: 1, notes: '' };

// Site public : formulaire de réservation (studio + séjour + coordonnées)
export default function Reserver() {
  const [recherche] = useSearchParams();
  const navigate = useNavigate();
  const studioId = recherche.get('studio');

  const [studio, setStudio] = useState(null);
  const [params, setParams] = useState({});
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');
  const [sejour, setSejour] = useState(null); // { formule, debut, fin, quantite } — vient de l'adresse ou proposé
  const [verif, setVerif] = useState(null); // { disponible, prix } | null pendant la vérification
  // Coordonnées gardées en brouillon (le client ne retape rien s'il revient)
  const [client, setClient, brouillon] = useBrouillon('reserver:coordonnees', COORDONNEES_VIDES);
  const [erreurs, setErreurs] = useState({});
  const [erreurEnvoi, setErreurEnvoi] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [pot, setPot] = useState(''); // champ caché anti-robots

  useEffect(() => { document.title = 'Réserver · Zaquia Résidence'; }, []);

  // Studio + paramètres, puis séjour : celui de l'adresse, sinon une proposition
  useEffect(() => {
    if (!studioId) { setChargement(false); return; }
    Promise.all([studioPublic(studioId), lireParametres().catch(() => ({}))])
      .then(([s, p]) => {
        setStudio(s);
        setParams(p);
        if (!s) return;
        const proposees = s.tarifs.map((t) => t.formule);
        const voulue = recherche.get('formule');
        const formule = proposees.includes(voulue) ? voulue : proposees.includes('nuitee') ? 'nuitee' : proposees[0];
        const debutUrl = recherche.get('debut');
        const finUrl = recherche.get('fin');
        if (debutUrl && finUrl) {
          setSejour({ formule, debut: debutUrl.slice(0, 16), fin: finUrl.slice(0, 16), quantite: 1 });
        } else {
          const d = debutParDefaut(formule, p);
          setSejour({ formule, debut: versChampDate(d), fin: versChampDate(calculerFin(formule, d, 1, p)), quantite: 1 });
        }
      })
      .catch(() => setErreurChargement('Impossible de charger ce studio pour le moment.'))
      .finally(() => setChargement(false));
  }, [studioId]); // la formule / les dates de l'adresse ne sont lues qu'au chargement

  // Prix et disponibilité vérifiés en direct (400 ms après la dernière modification)
  const sejourValide = sejour && sejour.debut && sejour.fin && new Date(sejour.fin) > new Date(sejour.debut);
  useEffect(() => {
    if (!studio || !sejourValide) { setVerif(null); return undefined; }
    let annule = false;
    setVerif(null);
    const t = setTimeout(() => {
      verifierSejour(studio.id, sejour.formule, sejour.debut, sejour.fin)
        .then((v) => { if (!annule) setVerif(v); })
        .catch(() => { if (!annule) setVerif({ disponible: false, prix: null, erreur: true }); });
    }, 400);
    return () => { annule = true; clearTimeout(t); };
  }, [studio, sejourValide, sejour?.formule, sejour?.debut, sejour?.fin]);

  const tarifs = useMemo(() => (studio ? [...studio.tarifs].sort((a, b) => ORDRE.indexOf(a.formule) - ORDRE.indexOf(b.formule)) : []), [studio]);

  const recalculer = (s) => ({ ...s, fin: s.debut ? versChampDate(calculerFin(s.formule, new Date(s.debut), s.quantite, params)) : s.fin });
  const choisirFormule = (formule) => {
    const base = sejour.debut ? new Date(sejour.debut) : new Date();
    setSejour(recalculer({ ...sejour, formule, quantite: 1, debut: versChampDate(debutParDefaut(formule, params, base)) }));
  };
  const majClient = (champ) => (e) => setClient((c) => ({ ...c, [champ]: e.target.value }));

  const envoyer = async (ev) => {
    ev.preventDefault();
    setErreurEnvoi('');
    if (pot) return; // robot
    const e = {};
    if (client.nom.trim().length < 2) e.nom = 'Indiquez votre nom complet.';
    const phone = normaliserTelephone(client.telephone);
    if (!phone) e.telephone = 'Numéro sénégalais invalide (ex : 77 123 45 67).';
    if (client.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email.trim())) e.email = 'Adresse email invalide.';
    setErreurs(e);
    if (Object.keys(e).length) return;
    if (!verif?.disponible || verif.prix == null) return setErreurEnvoi('Ce studio n’est pas disponible sur ces dates : modifiez votre séjour.');

    setEnvoi(true);
    try {
      const res = await creerReservationPublique({
        studioId: studio.id, formule: sejour.formule, debut: sejour.debut, fin: sejour.fin,
        nom: client.nom.trim(), phone, email: client.email.trim(), nbPersonnes: Number(client.nbPersonnes), notes: client.notes.trim(),
      });
      try { sessionStorage.setItem(`zaquia:suivi:${res.reference}`, phone); } catch { /* navigation privée */ }
      brouillon.abandonner(); // coordonnées effacées de l'appareil une fois la demande envoyée
      navigate(`/confirmation/${res.reference}`, { state: { phone } });
    } catch (err) {
      setErreurEnvoi(messageErreur(err, 'La réservation n’a pas pu être envoyée. Réessayez ou contactez-nous sur WhatsApp.'));
      if (err.code === '23P01') setVerif({ disponible: false, prix: verif?.prix ?? null });
    } finally {
      setEnvoi(false);
    }
  };

  if (chargement) return <p className="reserver__etat">Chargement…</p>;
  if (erreurChargement) return <p className="reserver__etat reserver__etat--erreur">{erreurChargement}</p>;
  if (!studioId || !studio) {
    return (
      <div className="reserver__etat">
        <p>{studioId ? 'Ce studio n’est plus proposé à la réservation.' : 'Choisissez d’abord un studio.'}</p>
        <Link className="btn btn-primaire" to="/studios">Voir nos studios</Link>
      </div>
    );
  }
  if (!tarifs.length) {
    return (
      <div className="reserver__etat">
        <p>Ce studio se réserve uniquement auprès de la réception.</p>
        {params.whatsapp && <a className="btn btn-rouge" href={`https://wa.me/${params.whatsapp}`} target="_blank" rel="noreferrer">Contacter sur WhatsApp</a>}
      </div>
    );
  }

  const champ = (nom) => `champ ${erreurs[nom] ? 'champ--erreur' : ''}`;
  const unites = (q) => (q > 1 ? UNITES_FORMULE_PLURIEL : UNITES_FORMULE)[sejour.formule];
  const pourcent = Number(params.acompte_pourcent ?? 30);

  return (
    <div className="reserver">
      <Link to={`/studios/${studio.id}`} className="reserver__retour">← {studio.nom}</Link>
      <h1>Réserver</h1>

      <div className="reserver__grille">
        <form className="reserver__formulaire" onSubmit={envoyer} noValidate>
          {/* ---- 1. Séjour ---- */}
          <section className="reserver__bloc">
            <h2><span>1</span> Votre séjour</h2>
            <div className="reserver__formules" role="radiogroup" aria-label="Formule">
              {tarifs.map((t) => (
                <button key={t.formule} type="button" role="radio" aria-checked={sejour.formule === t.formule}
                  className={sejour.formule === t.formule ? 'reserver__formule--choisie' : ''} onClick={() => choisirFormule(t.formule)}>
                  <strong>{FORMULES[t.formule]}</strong>
                  <small>{formatFCFA(t.prix)} / {UNITES_FORMULE[t.formule]}</small>
                </button>
              ))}
            </div>
            <div className="reserver__dates">
              <div className="champ">
                <label htmlFor="rv-debut">Arrivée</label>
                <input id="rv-debut" type="datetime-local" step="900" value={sejour.debut} min={versChampDate(new Date())}
                  onChange={(e) => setSejour(recalculer({ ...sejour, debut: e.target.value }))} />
              </div>
              <div className="champ">
                <label htmlFor="rv-qte">Durée</label>
                <select id="rv-qte" value={sejour.quantite} onChange={(e) => setSejour(recalculer({ ...sejour, quantite: Number(e.target.value) }))}>
                  {Array.from({ length: sejour.formule === 'heure' ? 12 : sejour.formule === 'mois' ? 3 : 14 }, (_, i) => i + 1).map((q) => (
                    <option key={q} value={q}>{q} {unites(q)}</option>
                  ))}
                </select>
              </div>
              <div className="champ">
                <label htmlFor="rv-fin">Départ</label>
                <input id="rv-fin" type="datetime-local" step="900" value={sejour.fin} min={sejour.debut}
                  onChange={(e) => setSejour({ ...sejour, fin: e.target.value })} />
              </div>
            </div>
            {sejour.formule === 'nuitee' && (
              <p className="reserver__aide">Nuitée : arrivée à partir de {params.nuitee_debut ?? '18:00'}, départ avant {params.nuitee_fin ?? '12:00'}.</p>
            )}
          </section>

          {/* ---- 2. Coordonnées ---- */}
          <section className="reserver__bloc">
            <h2><span>2</span> Vos coordonnées</h2>
            <div className="reserver__coordonnees">
              <div className={champ('nom')}>
                <label htmlFor="rv-nom">Nom complet *</label>
                <input id="rv-nom" autoComplete="name" value={client.nom} onChange={majClient('nom')} placeholder="Ex : Fatou Sané" />
                {erreurs.nom && <small className="champ__erreur">{erreurs.nom}</small>}
              </div>
              <div className={champ('telephone')}>
                <label htmlFor="rv-tel">Téléphone (WhatsApp de préférence) *</label>
                <div className="reserver__tel">
                  <span>+221</span>
                  <input id="rv-tel" type="tel" inputMode="tel" autoComplete="tel-national" value={client.telephone}
                    onChange={majClient('telephone')} placeholder="77 123 45 67" />
                </div>
                {erreurs.telephone && <small className="champ__erreur">{erreurs.telephone}</small>}
              </div>
              <div className={champ('email')}>
                <label htmlFor="rv-mail">Email (facultatif)</label>
                <input id="rv-mail" type="email" autoComplete="email" value={client.email} onChange={majClient('email')} />
                {erreurs.email && <small className="champ__erreur">{erreurs.email}</small>}
              </div>
              <div className="champ">
                <label htmlFor="rv-pers">Nombre de personnes</label>
                <select id="rv-pers" value={Math.min(client.nbPersonnes, studio.capacite)} onChange={majClient('nbPersonnes')}>
                  {Array.from({ length: studio.capacite }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="champ reserver__large">
                <label htmlFor="rv-notes">Message (facultatif)</label>
                <textarea id="rv-notes" rows={3} maxLength={500} value={client.notes} onChange={majClient('notes')}
                  placeholder="Heure d’arrivée prévue, demande particulière…" />
              </div>
            </div>
            {/* Piège à robots : invisible pour les visiteurs */}
            <input className="reserver__pot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={pot} onChange={(e) => setPot(e.target.value)} name="site_web" />
          </section>

          {erreurEnvoi && <p className="reserver__erreur" role="alert">{erreurEnvoi}</p>}

          <button type="submit" className="btn btn-rouge reserver__envoyer" disabled={envoi || !verif?.disponible || verif?.prix == null}>
            {envoi ? 'Envoi…' : 'Envoyer ma demande de réservation'}
          </button>
          <p className="reserver__mention">
            Aucun paiement maintenant. La réception confirme votre réservation par WhatsApp ou par téléphone.
            Vos coordonnées servent uniquement à gérer votre séjour.
          </p>
        </form>

        {/* ---- Récapitulatif ---- */}
        <aside className="reserver__recap">
          <div className="reserver__photo" style={studio.photos[0] ? { backgroundImage: `url(${studio.photos[0]})` } : undefined} />
          <div className="reserver__recap-corps">
            <strong className="reserver__studio">{studio.nom}</strong>
            <span className="reserver__categorie">{studio.categorie?.nom ?? 'Studio meublé'} · {studio.capacite} pers.</span>
            <dl>
              <dt>Formule</dt><dd>{FORMULES[sejour.formule]}</dd>
              <dt>Arrivée</dt><dd>{sejour.debut ? formatJourHeure(sejour.debut) : '—'}</dd>
              <dt>Départ</dt><dd>{sejour.fin ? formatJourHeure(sejour.fin) : '—'}</dd>
              {sejourValide && (<><dt>Durée</dt><dd>{formatDuree(sejour.debut, sejour.fin)}</dd></>)}
            </dl>
            <div className={`reserver__statut ${!sejourValide ? 'reserver__statut--non' : !verif ? '' : verif.disponible && verif.prix != null ? 'reserver__statut--oui' : 'reserver__statut--non'}`}>
              {!sejourValide ? 'Le départ doit être après l’arrivée.'
                : !verif ? 'Vérification…'
                  : verif.erreur ? 'Vérification impossible pour le moment.'
                    : !verif.disponible ? 'Déjà réservé sur ces dates : essayez d’autres dates.'
                      : verif.prix == null ? 'Formule non proposée pour ce studio.'
                        : '✓ Disponible'}
            </div>
            {verif?.prix != null && verif.disponible && (
              <div className="reserver__total">
                <span>Total</span>
                <strong>{formatFCFA(verif.prix)}</strong>
                {pourcent > 0 && <small>Un acompte d’environ {pourcent} % ({formatFCFA(Math.ceil((verif.prix * pourcent) / 100 / 100) * 100)}) peut être demandé à la confirmation.</small>}
              </div>
            )}
            {!verif?.disponible && sejourValide && verif && <Link to="/studios" className="reserver__autres">Voir les autres studios</Link>}
          </div>
        </aside>
      </div>
    </div>
  );
}
