import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import Confirm from '../../../components/Confirm/Confirm.jsx';
import { listerInventaire, alertesInventaire, ajouterArticle, modifierArticle, supprimerArticle, copierInventaire } from '../../../services/inventaire.js';
import { listerStudiosResume } from '../../../services/studios.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { ETATS_INVENTAIRE } from '../../../lib/format.js';
import './Inventaire.css';

// Articles proposés en un clic
const SUGGESTIONS = [
  'Lit', 'Matelas', 'Draps (jeu)', 'Oreillers', 'Serviettes', 'Rideaux', 'Climatisation', 'Télécommande clim', 'Ventilateur',
  'TV', 'Télécommande TV', 'Réfrigérateur', 'Micro-ondes', 'Plaque de cuisson', 'Bouilloire', 'Vaisselle (set)',
  'Ustensiles de cuisine', 'Fer à repasser', 'Table', 'Chaises', 'Armoire', 'Ampoules',
];

// Onglet « Inventaire » : matériel de chaque studio, quantité et état
export default function Inventaire() {
  const { profile } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const peutSupprimer = ['admin', 'gerant', 'receptionniste'].includes(profile?.role);

  const [studios, setStudios] = useState(null); // null = pas encore chargés
  const [alertes, setAlertes] = useState({});
  const studioId = params.get('studio') ?? studios?.[0]?.id ?? '';
  const choisirStudio = (id) => setParams({ onglet: 'inventaire', studio: id }, { replace: true });

  const [articles, setArticles] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [nouvel, setNouvel] = useState('');
  const [aSupprimer, setASupprimer] = useState(null);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    Promise.all([listerStudiosResume(), alertesInventaire()])
      .then(([s, a]) => { setStudios(s); setAlertes(a); })
      .catch((err) => { setErreur(messageErreur(err)); setChargement(false); });
  }, []);

  const charger = useCallback(async () => {
    if (!studioId) return;
    setErreur('');
    try {
      setArticles(await listerInventaire(studioId));
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger l’inventaire.'));
    } finally {
      setChargement(false);
    }
  }, [studioId]);

  useEffect(() => { setChargement(true); charger(); }, [charger]);

  const rafraichirAlertes = () => alertesInventaire().then(setAlertes).catch(() => {});

  const ajouter = async (article) => {
    const nom = article.trim();
    if (!nom) return;
    if (articles.some((a) => a.article.toLowerCase() === nom.toLowerCase())) return toast.erreur(`« ${nom} » est déjà dans la liste.`);
    setOccupe(true);
    try {
      const a = await ajouterArticle(studioId, { article: nom });
      setArticles((liste) => [...liste, a].sort((x, y) => x.article.localeCompare(y.article, 'fr')));
      setNouvel('');
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setOccupe(false);
    }
  };

  // Modification immédiate (quantité, état, note) : affichage optimiste, annulé en cas d'erreur
  const modifier = async (article, valeurs) => {
    setArticles((liste) => liste.map((a) => (a.id === article.id ? { ...a, ...valeurs } : a)));
    try {
      await modifierArticle(article.id, valeurs);
      if ('etat' in valeurs) rafraichirAlertes();
    } catch (err) {
      toast.erreur(messageErreur(err));
      charger();
    }
  };

  const supprimer = async () => {
    setOccupe(true);
    try {
      await supprimerArticle(aSupprimer.id);
      setArticles((liste) => liste.filter((a) => a.id !== aSupprimer.id));
      rafraichirAlertes();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setOccupe(false);
      setASupprimer(null);
    }
  };

  const copier = async (depuis) => {
    if (!depuis) return;
    setOccupe(true);
    try {
      const n = await copierInventaire(depuis, studioId);
      toast.succes(n ? `${n} article(s) copié(s).` : 'Aucun nouvel article à copier.');
      charger();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setOccupe(false);
    }
  };

  const studio = studios?.find((s) => s.id === studioId);
  const suggestions = SUGGESTIONS.filter((s) => !articles.some((a) => a.article.toLowerCase() === s.toLowerCase()));
  const aRemplacer = articles.filter((a) => a.etat === 'a_remplacer').length;

  if (!studios && !erreur) return <div className="inv__etat">Chargement…</div>;
  if (studios && !studios.length) return <div className="inv__etat">Aucun studio : créez-en d’abord dans « Studios & tarifs ».</div>;

  return (
    <div className="inv">
      <div className="inv__studios" role="tablist" aria-label="Studio">
        {(studios ?? []).map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={s.id === studioId}
            className={s.id === studioId ? 'inv__studio--actif' : ''} onClick={() => choisirStudio(s.id)}>
            {s.code}
            {alertes[s.id] > 0 && <span className="inv__pastille" title={`${alertes[s.id]} article(s) à remplacer`}>{alertes[s.id]}</span>}
          </button>
        ))}
      </div>

      {chargement ? (
        <div className="inv__etat">Chargement de l’inventaire…</div>
      ) : erreur ? (
        <div className="inv__etat inv__etat--erreur"><p>{erreur}</p><button className="btn btn-contour" onClick={charger}>Réessayer</button></div>
      ) : (
        <section className="inv__carte">
          <header className="inv__entete">
            <div>
              <h2>{studio?.code} – {studio?.nom}</h2>
              <p>{articles.length} article(s){aRemplacer ? <span className="inv__alerte"> · {aRemplacer} à remplacer</span> : ''}</p>
            </div>
            {studios?.length > 1 && (
              <select value="" onChange={(e) => copier(e.target.value)} disabled={occupe} aria-label="Copier l’inventaire d’un autre studio">
                <option value="">Copier la liste d’un autre studio…</option>
                {studios.filter((s) => s.id !== studioId).map((s) => <option key={s.id} value={s.id}>{s.code} – {s.nom}</option>)}
              </select>
            )}
          </header>

          {!articles.length ? (
            <p className="inv__vide">Aucun article. Ajoutez-les ci-dessous ou copiez la liste d’un autre studio.</p>
          ) : (
            <ul className="inv__liste">
              {articles.map((a) => (
                <li key={a.id} className={`inv__article inv__article--${a.etat}`}>
                  <strong>{a.article}</strong>
                  <span className="inv__quantite">
                    <button type="button" onClick={() => modifier(a, { quantite: Math.max(0, a.quantite - 1) })} aria-label="Moins">−</button>
                    <span>{a.quantite}</span>
                    <button type="button" onClick={() => modifier(a, { quantite: a.quantite + 1 })} aria-label="Plus">+</button>
                  </span>
                  <select value={a.etat} onChange={(e) => modifier(a, { etat: e.target.value })} aria-label={`État de ${a.article}`}>
                    {Object.entries(ETATS_INVENTAIRE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input className="inv__note" defaultValue={a.notes ?? ''} placeholder="Note…" aria-label={`Note pour ${a.article}`}
                    onBlur={(e) => e.target.value.trim() !== (a.notes ?? '') && modifier(a, { notes: e.target.value.trim() || null })} />
                  {peutSupprimer && (
                    <button type="button" className="inv__supprimer" onClick={() => setASupprimer(a)} aria-label={`Supprimer ${a.article}`}>×</button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form className="inv__ajout" onSubmit={(e) => { e.preventDefault(); ajouter(nouvel); }}>
            <input value={nouvel} onChange={(e) => setNouvel(e.target.value)} placeholder="Ajouter un article (ex : Ventilateur)" aria-label="Nouvel article" />
            <button type="submit" className="btn btn-primaire" disabled={occupe || !nouvel.trim()}>Ajouter</button>
          </form>

          {suggestions.length > 0 && (
            <div className="inv__suggestions">
              <span>Ajout rapide :</span>
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => ajouter(s)} disabled={occupe}>+ {s}</button>
              ))}
            </div>
          )}
        </section>
      )}

      <Confirm
        ouvert={!!aSupprimer}
        titre="Retirer de l’inventaire"
        message={aSupprimer && `Retirer « ${aSupprimer.article} » de l’inventaire de ${studio?.code} ?`}
        libelle="Retirer"
        enCours={occupe}
        onConfirmer={supprimer}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  );
}
