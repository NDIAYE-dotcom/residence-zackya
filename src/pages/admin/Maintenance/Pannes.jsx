import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import Confirm from '../../../components/Confirm/Confirm.jsx';
import Galerie from '../../../components/Galerie/Galerie.jsx';
import { listerPannes, coutMaintenancesDepuis, prendreEnCharge, changerPriorite, supprimerPanne } from '../../../services/maintenance.js';
import { listerStudiosResume } from '../../../services/studios.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, formatDateHeure, PRIORITES, STATUTS_TACHE } from '../../../lib/format.js';
import SignalerModal from './SignalerModal.jsx';
import ResoudreModal from './ResoudreModal.jsx';
import './Pannes.css';

const ORDRE_PRIORITE = { urgente: 0, haute: 1, normale: 2, basse: 3 };

// Onglet « Pannes » : signalement, suivi, résolution avec coût
export default function Pannes() {
  const { profile } = useAuth();
  const toast = useToast();
  const peutSupprimer = ['admin', 'gerant'].includes(profile?.role);

  const [pannes, setPannes] = useState([]);
  const [studios, setStudios] = useState([]);
  const [coutMois, setCoutMois] = useState(0);
  const [filtres, setFiltres] = useState({ statut: 'ouvertes', studioId: '' });
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [fenetre, setFenetre] = useState(null); // signaler | { resoudre: panne } | { supprimer: panne }
  const [galerie, setGalerie] = useState(null);
  const [occupe, setOccupe] = useState(null);

  const charger = useCallback(async () => {
    setErreur('');
    try {
      const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0);
      const [p, s, c] = await Promise.all([listerPannes(filtres), listerStudiosResume(), coutMaintenancesDepuis(debutMois)]);
      // Les plus urgentes d'abord, puis les plus anciennes
      setPannes(filtres.statut === 'terminee' ? p : [...p].sort((a, b) =>
        ORDRE_PRIORITE[a.priorite] - ORDRE_PRIORITE[b.priorite] || new Date(a.created_at) - new Date(b.created_at)));
      setStudios(s);
      setCoutMois(c);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger les pannes.'));
    } finally {
      setChargement(false);
    }
  }, [filtres]);

  useEffect(() => { setChargement(true); charger(); }, [charger]);

  const agir = async (panne, fn, message) => {
    setOccupe(panne.id);
    try { await fn(); toast.succes(message); await charger(); } catch (err) { toast.erreur(messageErreur(err)); } finally { setOccupe(null); }
  };

  const ouvertes = pannes.filter((p) => p.statut !== 'terminee');
  const urgentes = ouvertes.filter((p) => p.priorite === 'urgente').length;

  return (
    <>
      <section className="pannes__barre">
        <div className="pannes__kpis">
          <span><strong>{filtres.statut === 'ouvertes' ? ouvertes.length : '—'}</strong> ouverte(s)</span>
          <span className={urgentes ? 'pannes__kpi--urgent' : ''}><strong>{filtres.statut === 'ouvertes' ? urgentes : '—'}</strong> urgente(s)</span>
          <span><strong>{formatFCFA(coutMois)}</strong> de réparations ce mois</span>
        </div>
        <button className="btn btn-rouge" onClick={() => setFenetre('signaler')}>+ Signaler une panne</button>
      </section>

      <div className="pannes__filtres">
        <select value={filtres.statut} onChange={(e) => setFiltres((f) => ({ ...f, statut: e.target.value }))} aria-label="Statut">
          <option value="ouvertes">À traiter (à faire + en cours)</option>
          <option value="terminee">Résolues</option>
          <option value="">Toutes</option>
        </select>
        <select value={filtres.studioId} onChange={(e) => setFiltres((f) => ({ ...f, studioId: e.target.value }))} aria-label="Studio">
          <option value="">Tous les studios</option>
          {studios.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.nom}</option>)}
        </select>
      </div>

      {chargement ? (
        <div className="pannes__etat">Chargement…</div>
      ) : erreur ? (
        <div className="pannes__etat pannes__etat--erreur"><p>{erreur}</p><button className="btn btn-contour" onClick={charger}>Réessayer</button></div>
      ) : !pannes.length ? (
        <div className="pannes__etat pannes__etat--ok">
          <strong>{filtres.statut === 'ouvertes' ? 'Aucune panne en cours 👍' : 'Aucune panne.'}</strong>
          <p>Une panne remarquée (clim, eau, électricité…) ? Signalez-la avec une photo.</p>
        </div>
      ) : (
        <div className="pannes__liste">
          {pannes.map((p) => (
            <article key={p.id} className={`panne panne--${p.priorite} ${p.statut === 'terminee' ? 'panne--resolue' : ''}`}>
              <header className="panne__entete">
                <span className="panne__studio">{p.studio_code}</span>
                <div>
                  <strong>{p.titre}</strong>
                  <span className="panne__etiquettes">
                    <span className={`panne__priorite panne__priorite--${p.priorite}`}>{PRIORITES[p.priorite]}</span>
                    <span className={`panne__statut panne__statut--${p.statut}`}>{STATUTS_TACHE[p.statut]}</span>
                    {p.studio_statut === 'maintenance' && p.statut !== 'terminee' && <span className="panne__bloque">Studio en maintenance</span>}
                  </span>
                </div>
              </header>

              {p.description && <p className="panne__description">{p.description}</p>}

              {p.photos?.length > 0 && (
                <div className="panne__photos">
                  {p.photos.map((url, i) => (
                    <button key={url} type="button" onClick={() => setGalerie({ photos: p.photos, index: i, titre: `${p.studio_code} · ${p.titre}` })}
                      aria-label={`Agrandir la photo ${i + 1}`}>
                      <img src={url} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}

              <p className="panne__meta">
                Signalée le {formatDateHeure(p.created_at)}{p.signale_par_nom ? ` par ${p.signale_par_nom}` : ''}
                {p.statut === 'terminee' && (
                  <>
                    <br />Résolue le {formatDateHeure(p.resolu_le)}{p.resolu_par_nom ? ` par ${p.resolu_par_nom}` : ''} · coût {formatFCFA(p.cout ?? 0)}
                    {p.depense_id ? ' (dépense enregistrée)' : ''}
                    {p.notes_resolution && <><br />« {p.notes_resolution} »</>}
                  </>
                )}
              </p>

              {p.statut !== 'terminee' && (
                <footer className="panne__actions">
                  {p.statut === 'a_faire' && (
                    <button type="button" className="btn btn-contour" disabled={occupe === p.id}
                      onClick={() => agir(p, () => prendreEnCharge(p), 'Panne prise en charge.')}>Prendre en charge</button>
                  )}
                  <button type="button" className="btn btn-primaire" disabled={occupe === p.id}
                    onClick={() => setFenetre({ resoudre: p })}>Résolue</button>
                  <select value={p.priorite} disabled={occupe === p.id} aria-label="Priorité"
                    onChange={(e) => agir(p, () => changerPriorite(p, e.target.value), 'Priorité modifiée.')}>
                    {Object.entries(PRIORITES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {peutSupprimer && (
                    <button type="button" className="panne__supprimer" onClick={() => setFenetre({ supprimer: p })}>Supprimer</button>
                  )}
                </footer>
              )}
            </article>
          ))}
        </div>
      )}

      {fenetre === 'signaler' && (
        <SignalerModal studios={studios} onFermer={() => setFenetre(null)}
          onSignale={(p) => {
            toast.succes(p.priorite === 'urgente' ? 'Panne urgente signalée : le studio passe en maintenance.' : 'Panne signalée.');
            setFenetre(null); charger();
          }} />
      )}
      {fenetre?.resoudre && (
        <ResoudreModal panne={fenetre.resoudre} onFermer={() => setFenetre(null)}
          onResolue={() => { toast.succes('Panne résolue.'); setFenetre(null); charger(); }} />
      )}
      <Confirm
        ouvert={!!fenetre?.supprimer}
        titre="Supprimer la panne"
        message={fenetre?.supprimer && `Supprimer « ${fenetre.supprimer.titre} » (${fenetre.supprimer.studio_code}) et ses photos ?`}
        libelle="Supprimer"
        enCours={!!occupe}
        onConfirmer={async () => { await agir(fenetre.supprimer, () => supprimerPanne(fenetre.supprimer), 'Panne supprimée.'); setFenetre(null); }}
        onAnnuler={() => setFenetre(null)}
      />
      {galerie && <Galerie photos={galerie.photos} indexInitial={galerie.index} titre={galerie.titre} onFermer={() => setGalerie(null)} />}
    </>
  );
}
