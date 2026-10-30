import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { studiosPlanning, reservationsPeriode, abonnerPlanning } from '../../../services/planning.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { FORMULES, STATUTS_RESERVATION, STATUTS_STUDIO } from '../../../lib/format.js';
import { versChampDate, versChampJour } from '../../../lib/dates.js';
import './Planning.css';

const VUES = { jour: 'Jour', semaine: 'Semaine', mois: 'Mois' };

const minuit = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const plusJours = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// Période affichée et ses colonnes (heures pour la vue Jour, jours sinon)
function calculerPeriode(vue, date) {
  const d = minuit(date);
  if (vue === 'jour') {
    const colonnes = Array.from({ length: 24 }, (_, h) => { const c = new Date(d); c.setHours(h); return c; });
    return { debut: d, fin: plusJours(d, 1), colonnes };
  }
  if (vue === 'semaine') {
    const lundi = plusJours(d, -((d.getDay() + 6) % 7));
    return { debut: lundi, fin: plusJours(lundi, 7), colonnes: Array.from({ length: 7 }, (_, i) => plusJours(lundi, i)) };
  }
  const premier = new Date(d.getFullYear(), d.getMonth(), 1);
  const suivant = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const nb = Math.round((suivant - premier) / 86400000);
  return { debut: premier, fin: suivant, colonnes: Array.from({ length: nb }, (_, i) => plusJours(premier, i)) };
}

function decaler(vue, date, sens) {
  if (vue === 'jour') return plusJours(date, sens);
  if (vue === 'semaine') return plusJours(date, 7 * sens);
  return new Date(date.getFullYear(), date.getMonth() + sens, 1);
}

function titrePeriode(vue, p) {
  if (vue === 'jour') return p.debut.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  if (vue === 'mois') return p.debut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const dernier = plusJours(p.fin, -1);
  return `${p.debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${dernier.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

const libelleColonne = (vue, c) => (vue === 'jour'
  ? `${c.getHours()}h`
  : vue === 'semaine'
    ? c.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
    : String(c.getDate()));

const heure = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Planning : studios × temps, barres de réservation, temps réel
export default function Planning() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const peutOuvrir = ['admin', 'gerant', 'receptionniste', 'comptable'].includes(profile?.role);
  const peutCreer = ['admin', 'gerant', 'receptionniste'].includes(profile?.role);

  // Vue et date dans l'adresse : une actualisation garde la position
  const vue = VUES[params.get('vue')] ? params.get('vue') : 'semaine';
  const date = useMemo(() => (params.get('date') ? new Date(`${params.get('date')}T00:00:00`) : new Date()), [params]);
  const periode = useMemo(() => calculerPeriode(vue, date), [vue, date]);
  const aller = (nouvelleVue, nouvelleDate) => setParams({ vue: nouvelleVue, date: versChampJour(nouvelleDate) }, { replace: true });

  const [studios, setStudios] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [connexion, setConnexion] = useState('connexion'); // connexion | actif | erreur
  const [derniereMaj, setDerniereMaj] = useState(null); // heure de la dernière mise à jour reçue en direct
  const [flash, setFlash] = useState(false);
  const [maintenant, setMaintenant] = useState(() => new Date());

  const charger = useCallback(async () => {
    setErreur('');
    try {
      const [s, r] = await Promise.all([studiosPlanning(), reservationsPeriode(periode.debut, periode.fin)]);
      setStudios(s);
      setReservations(r);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger le planning.'));
    } finally {
      setChargement(false);
    }
  }, [periode]);

  useEffect(() => { charger(); }, [charger]);

  // Temps réel : rechargement groupé 400 ms après un changement
  const minuteur = useRef(null);
  useEffect(() => {
    const desabonner = abonnerPlanning(() => {
      clearTimeout(minuteur.current);
      minuteur.current = setTimeout(() => {
        charger();
        setDerniereMaj(new Date());
        setFlash(true);
        setTimeout(() => setFlash(false), 2500);
      }, 400);
    }, (statut) => {
      if (statut === 'SUBSCRIBED') setConnexion('actif');
      else if (['CHANNEL_ERROR', 'TIMED_OUT'].includes(statut)) setConnexion('erreur');
    });
    return () => { clearTimeout(minuteur.current); desabonner(); };
  }, [charger]);

  // Trait « maintenant » rafraîchi chaque minute
  useEffect(() => {
    const t = setInterval(() => setMaintenant(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const duree = periode.fin - periode.debut;
  const position = (d) => Math.min(Math.max((new Date(d) - periode.debut) / duree, 0), 1) * 100;

  const parStudio = useMemo(() => {
    const m = {};
    for (const r of reservations) (m[r.studio_id] ??= []).push(r);
    return m;
  }, [reservations]);

  // Clic sur une case vide → nouvelle réservation pré-remplie
  const cliquerCase = (studio, e) => {
    if (!peutCreer || e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = new Date(periode.debut.getTime() + ((e.clientX - rect.left) / rect.width) * duree);
    const formule = vue === 'jour' ? 'heure' : 'nuitee';
    if (vue === 'jour') t.setMinutes(0, 0, 0); else t.setHours(0, 0, 0, 0);
    navigate(`/admin/reservations/nouvelle?studio=${studio.id}&formule=${formule}&debut=${encodeURIComponent(versChampDate(t))}`);
  };

  const aujourdhui = minuit(maintenant).getTime();
  const nowVisible = maintenant >= periode.debut && maintenant < periode.fin;
  const colonnesSpeciales = periode.colonnes.map((c, i) => ({
    i,
    weekend: vue !== 'jour' && [0, 6].includes(c.getDay()),
    jour: vue !== 'jour' && minuit(c).getTime() === aujourdhui,
  })).filter((c) => c.weekend || c.jour);

  return (
    <div className="planning">
      <header className="planning__entete">
        <div>
          <h1>Planning</h1>
          <p className={`planning__direct planning__direct--${connexion} ${flash ? 'planning__direct--flash' : ''}`} role="status">
            <span aria-hidden="true" />
            {connexion === 'connexion' && 'Connexion au temps réel…'}
            {connexion === 'erreur' && 'Temps réel indisponible : actualisez la page'}
            {connexion === 'actif' && (derniereMaj
              ? `Temps réel activé · mis à jour en direct à ${derniereMaj.toLocaleTimeString('fr-FR')}`
              : 'Temps réel activé')}
          </p>
        </div>
        <div className="planning__vues" role="tablist" aria-label="Vue">
          {Object.entries(VUES).map(([k, v]) => (
            <button key={k} type="button" role="tab" aria-selected={vue === k}
              className={vue === k ? 'planning__vue--active' : ''} onClick={() => aller(k, date)}>
              {v}
            </button>
          ))}
        </div>
      </header>

      <div className="planning__navigation">
        <button type="button" className="planning__fleche" onClick={() => aller(vue, decaler(vue, date, -1))} aria-label="Période précédente">‹</button>
        <button type="button" className="btn btn-contour" onClick={() => aller(vue, new Date())}>Aujourd’hui</button>
        <button type="button" className="planning__fleche" onClick={() => aller(vue, decaler(vue, date, 1))} aria-label="Période suivante">›</button>
        <h2>{titrePeriode(vue, periode)}</h2>
        <input type="date" value={versChampJour(date)} aria-label="Aller à la date"
          onChange={(e) => e.target.value && aller(vue, new Date(`${e.target.value}T00:00:00`))} />
      </div>

      {chargement ? (
        <div className="planning__etat">Chargement du planning…</div>
      ) : erreur ? (
        <div className="planning__etat planning__etat--erreur">
          <p>{erreur}</p>
          <button className="btn btn-contour" onClick={charger}>Réessayer</button>
        </div>
      ) : !studios.length ? (
        <div className="planning__etat">Aucun studio enregistré.</div>
      ) : (
        <div className="planning__cadre">
          <div className={`planning__grille planning__grille--${vue}`} style={{ '--colonnes': periode.colonnes.length }}>
            {/* En-tête des colonnes */}
            <div className="planning__ligne planning__ligne--entete">
              <div className="planning__coin">Studio</div>
              <div className="planning__colonnes">
                {periode.colonnes.map((c, i) => (
                  <span key={i} className={vue !== 'jour' && minuit(c).getTime() === aujourdhui ? 'planning__colonne--aujourdhui' : ''}>
                    {libelleColonne(vue, c)}
                  </span>
                ))}
              </div>
            </div>

            {/* Une ligne par studio */}
            {studios.map((s) => (
              <div key={s.id} className="planning__ligne">
                <div className="planning__studio" title={`${s.nom} · ${STATUTS_STUDIO[s.statut]}`}>
                  <span className={`planning__point planning__point--${s.statut}`} aria-hidden="true" />
                  <strong>{s.code}</strong>
                  <small>{s.nom}</small>
                </div>
                <div className={`planning__piste ${peutCreer ? 'planning__piste--cliquable' : ''}`}
                  onClick={(e) => cliquerCase(s, e)}
                  title={peutCreer ? 'Cliquez sur une case vide pour réserver' : undefined}>
                  {colonnesSpeciales.map((c) => (
                    <span key={c.i} aria-hidden="true"
                      className={`planning__fond ${c.jour ? 'planning__fond--aujourdhui' : 'planning__fond--weekend'}`}
                      style={{ left: `${(c.i / periode.colonnes.length) * 100}%`, width: `${100 / periode.colonnes.length}%` }} />
                  ))}

                  {(parStudio[s.id] ?? []).map((r) => {
                    // Départ anticipé : la barre s'arrête au check-out réel
                    const fin = r.statut === 'terminee' && r.checkout_at && new Date(r.checkout_at) < new Date(r.date_fin) ? r.checkout_at : r.date_fin;
                    const gauche = position(r.date_debut);
                    const largeur = Math.max(position(fin) - gauche, 0.6);
                    const nom = r.client?.full_name ?? r.reference;
                    const infos = `${nom} · ${FORMULES[r.formule]} · ${STATUTS_RESERVATION[r.statut]}\n${new Date(r.date_debut).toLocaleString('fr-FR')} → ${new Date(fin).toLocaleString('fr-FR')}`;
                    return (
                      <button key={r.id} type="button"
                        className={`planning__barre planning__barre--${r.statut} ${new Date(r.date_debut) < periode.debut ? 'planning__barre--suite' : ''}`}
                        style={{ left: `${gauche}%`, width: `${largeur}%` }}
                        title={infos} aria-label={infos}
                        disabled={!peutOuvrir}
                        onClick={() => navigate(`/admin/reservations/${r.id}`)}>
                        <span>{nom}{vue === 'jour' ? ` · ${heure(r.date_debut)}–${heure(fin)}` : ''}</span>
                      </button>
                    );
                  })}

                  {nowVisible && <span className="planning__maintenant" style={{ left: `${position(maintenant)}%` }} aria-hidden="true" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="planning__legende">
        {['en_attente', 'confirmee', 'en_cours', 'terminee'].map((st) => (
          <span key={st}><i className={`planning__barre--${st}`} aria-hidden="true" />{STATUTS_RESERVATION[st]}</span>
        ))}
        <span><i className="planning__legende-maintenant" aria-hidden="true" />Maintenant</span>
        {!reservations.length && !chargement && !erreur && <em>Aucune réservation sur cette période.</em>}
      </footer>
    </div>
  );
}
