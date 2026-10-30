import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BarresHorizontales from '../../../components/BarresHorizontales/BarresHorizontales.jsx';
import { rapportPeriode } from '../../../services/rapports.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, formatDate, FORMULES, SOURCES_RESERVATION } from '../../../lib/format.js';
import { versChampJour } from '../../../lib/dates.js';
import { formatTelephone } from '../../../lib/telephone.js';
import { telechargerCSV } from '../../../lib/csv.js';
import './Rapports.css';

// Le graphique (recharts) n'est chargé qu'à l'ouverture des rapports
const GraphiqueEvolution = lazy(() => import('./GraphiqueEvolution.jsx'));

const jour = (d) => versChampJour(d);
const PERIODES = [
  { id: 'mois', label: 'Ce mois', calc: (n) => [jour(new Date(n.getFullYear(), n.getMonth(), 1)), jour(n)] },
  { id: 'mois-1', label: 'Mois dernier', calc: (n) => [jour(new Date(n.getFullYear(), n.getMonth() - 1, 1)), jour(new Date(n.getFullYear(), n.getMonth(), 0))] },
  { id: '3mois', label: '3 derniers mois', calc: (n) => [jour(new Date(n.getFullYear(), n.getMonth() - 2, 1)), jour(n)] },
  { id: 'annee', label: 'Cette année', calc: (n) => [jour(new Date(n.getFullYear(), 0, 1)), jour(n)] },
];

const pourcent = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// Module « Rapports » (admin, gérant, comptable)
export default function Rapports() {
  const [params, setParams] = useSearchParams();
  const maintenant = new Date();
  const [duDefaut, auDefaut] = PERIODES[0].calc(maintenant);
  const du = params.get('du') ?? duDefaut;
  const au = params.get('au') ?? auDefaut;
  const choisir = (d, a) => setParams({ du: d, au: a }, { replace: true });
  const active = PERIODES.find((p) => { const [d, a] = p.calc(maintenant); return d === du && a === au; })?.id;

  const [rapport, setRapport] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(async () => {
    if (au < du) { setErreur('La date de fin doit être après la date de début.'); setChargement(false); return; }
    setErreur('');
    setChargement(true);
    try {
      setRapport(await rapportPeriode(du, au));
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de calculer le rapport.'));
    } finally {
      setChargement(false);
    }
  }, [du, au]);

  useEffect(() => { charger(); }, [charger]);

  const r = rapport;
  const benefice = r ? r.ca - r.depenses : 0;
  const occupation = r ? pourcent(r.heures_occupees, r.heures_periode * r.nb_studios) : 0;

  const studios = useMemo(() => (r?.par_studio ?? []).map((s) => ({
    ...s, occupation: pourcent(s.heures, r.heures_periode), resultat: s.ca - s.depenses,
  })), [r]);

  const suffixe = `${du}_${au}`;
  const exporter = {
    studios: () => telechargerCSV(`rapport-studios-${suffixe}.csv`, [
      { titre: 'Studio', valeur: (s) => `${s.code} - ${s.nom}` },
      { titre: 'Occupation (%)', valeur: (s) => s.occupation },
      { titre: 'Heures occupées', valeur: (s) => s.heures },
      { titre: 'CA (FCFA)', valeur: (s) => s.ca },
      { titre: 'Dépenses (FCFA)', valeur: (s) => s.depenses },
      { titre: 'Résultat (FCFA)', valeur: (s) => s.resultat },
    ], studios),
    formules: () => telechargerCSV(`rapport-formules-${suffixe}.csv`, [
      { titre: 'Formule', valeur: (f) => FORMULES[f.cle] ?? f.cle },
      { titre: 'Réservations', valeur: (f) => f.nb },
      { titre: 'CA (FCFA)', valeur: (f) => f.ca },
    ], r.par_formule),
    sources: () => telechargerCSV(`rapport-sources-${suffixe}.csv`, [
      { titre: 'Source', valeur: (f) => SOURCES_RESERVATION[f.cle] ?? f.cle },
      { titre: 'Réservations', valeur: (f) => f.nb },
      { titre: 'CA (FCFA)', valeur: (f) => f.ca },
    ], r.par_source),
    clients: () => telechargerCSV(`rapport-clients-${suffixe}.csv`, [
      { titre: 'Client', valeur: (c) => c.nom },
      { titre: 'Téléphone', valeur: (c) => c.phone },
      { titre: 'Réservations', valeur: (c) => c.nb },
      { titre: 'CA (FCFA)', valeur: (c) => c.ca },
    ], r.top_clients),
    evolution: () => telechargerCSV(`rapport-evolution-${suffixe}.csv`, [
      { titre: r.granularite === 'jour' ? 'Jour' : 'Mois', valeur: (s) => (r.granularite === 'jour' ? formatDate(s.debut) : s.debut.slice(0, 7)) },
      { titre: 'CA (FCFA)', valeur: (s) => s.ca },
      { titre: 'Dépenses (FCFA)', valeur: (s) => s.depenses },
      { titre: 'Résultat (FCFA)', valeur: (s) => s.ca - s.depenses },
    ], r.serie),
  };

  const BoutonExport = ({ onClick }) => <button type="button" className="rapports__export" onClick={onClick}>Exporter</button>;

  return (
    <div className="rapports">
      <header className="rapports__entete">
        <div>
          <h1>Rapports</h1>
          <p>Du {formatDate(du)} au {formatDate(au)}</p>
        </div>
      </header>

      <section className="rapports__periode">
        {PERIODES.map((p) => (
          <button key={p.id} type="button" className={`rapports__puce ${active === p.id ? 'rapports__puce--active' : ''}`}
            onClick={() => choisir(...p.calc(maintenant))}>
            {p.label}
          </button>
        ))}
        <label>Du <input type="date" value={du} max={au} onChange={(e) => e.target.value && choisir(e.target.value, au)} /></label>
        <label>au <input type="date" value={au} min={du} onChange={(e) => e.target.value && choisir(du, e.target.value)} /></label>
      </section>

      {chargement && !r ? (
        <div className="rapports__etat">Calcul du rapport…</div>
      ) : erreur ? (
        <div className="rapports__etat rapports__etat--erreur">
          <p>{erreur}</p>
          <button className="btn btn-contour" onClick={charger}>Réessayer</button>
        </div>
      ) : r && (
        <div className={chargement ? 'rapports__contenu rapports__contenu--maj' : 'rapports__contenu'}>
          {/* ---- Indicateurs ---- */}
          <section className="rapports__kpis">
            <div className="rapports__kpi rapports__kpi--bleu">
              <span>Chiffre d’affaires</span><strong>{formatFCFA(r.ca)}</strong>
              <small>hors cautions ({formatFCFA(r.cautions)} de cautions reçues)</small>
            </div>
            <div className="rapports__kpi rapports__kpi--rouge">
              <span>Dépenses</span><strong>{formatFCFA(r.depenses)}</strong>
              <small>{r.depenses_categories.length} catégorie(s)</small>
            </div>
            <div className={`rapports__kpi ${benefice >= 0 ? 'rapports__kpi--vert' : 'rapports__kpi--rouge rapports__kpi--perte'}`}>
              <span>Bénéfice net</span><strong>{formatFCFA(benefice)}</strong>
              <small>{r.ca ? `marge ${pourcent(benefice, r.ca)} %` : '—'}</small>
            </div>
            <div className="rapports__kpi">
              <span>Taux d’occupation</span><strong>{occupation} %</strong>
              <small>≈ {Math.round(r.heures_occupees / 24)} nuits occupées sur {Math.round((r.heures_periode * r.nb_studios) / 24)} possibles</small>
            </div>
            <div className="rapports__kpi">
              <span>Réservations créées</span><strong>{r.nb_reservations}</strong>
              <small>{r.nb_annulations} annulation(s) / no-show</small>
            </div>
          </section>

          {/* ---- Évolution ---- */}
          <section className="rapports__carte">
            <div className="rapports__titre">
              <h2>Évolution {r.granularite === 'jour' ? 'jour par jour' : 'mois par mois'}</h2>
              <BoutonExport onClick={exporter.evolution} />
            </div>
            {r.serie.every((s) => !s.ca && !s.depenses) ? (
              <p className="rapports__vide">Aucun paiement ni dépense sur cette période.</p>
            ) : (
              <Suspense fallback={<p className="rapports__vide">Chargement du graphique…</p>}>
                <GraphiqueEvolution serie={r.serie} granularite={r.granularite} />
              </Suspense>
            )}
          </section>

          {/* ---- Par studio ---- */}
          <section className="rapports__carte">
            <div className="rapports__titre">
              <h2>Par studio</h2>
              <BoutonExport onClick={exporter.studios} />
            </div>
            <div className="rapports__tableau-cadre">
              <table className="rapports__tableau">
                <thead>
                  <tr><th>Studio</th><th>Occupation</th><th>Chiffre d’affaires</th><th>Dépenses</th><th>Résultat</th></tr>
                </thead>
                <tbody>
                  {studios.map((s) => (
                    <tr key={s.code}>
                      <td><strong>{s.code}</strong> <span className="rapports__doux">{s.nom}</span></td>
                      <td>
                        <span className="rapports__occ">
                          <span className="rapports__occ-piste"><span style={{ width: `${Math.min(s.occupation, 100)}%` }} /></span>
                          {s.occupation} %
                        </span>
                      </td>
                      <td>{formatFCFA(s.ca)}</td>
                      <td>{formatFCFA(s.depenses)}</td>
                      <td className={s.resultat >= 0 ? 'rapports__positif' : 'rapports__negatif'}>{formatFCFA(s.resultat)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="rapports__note">Les dépenses sans studio (électricité, salaires…) ne sont comptées que dans le total général.</p>
          </section>

          <div className="rapports__grille">
            <section className="rapports__carte">
              <div className="rapports__titre"><h2>CA par formule</h2><BoutonExport onClick={exporter.formules} /></div>
              <BarresHorizontales vide="Aucun paiement sur la période."
                elements={r.par_formule.map((f) => ({ cle: f.cle, libelle: FORMULES[f.cle] ?? f.cle, valeur: f.ca, texte: formatFCFA(f.ca), detail: `${f.nb} résa` }))} />
            </section>

            <section className="rapports__carte">
              <div className="rapports__titre"><h2>CA par source</h2><BoutonExport onClick={exporter.sources} /></div>
              <BarresHorizontales vide="Aucun paiement sur la période."
                elements={r.par_source.map((f) => ({ cle: f.cle, libelle: SOURCES_RESERVATION[f.cle] ?? f.cle, valeur: f.ca, texte: formatFCFA(f.ca), detail: `${f.nb} résa` }))} />
            </section>

            <section className="rapports__carte">
              <div className="rapports__titre"><h2>Meilleurs clients</h2><BoutonExport onClick={exporter.clients} /></div>
              {!r.top_clients.length ? (
                <p className="rapports__vide">Aucun client payant sur la période.</p>
              ) : (
                <ol className="rapports__clients">
                  {r.top_clients.map((c, i) => (
                    <li key={c.id}>
                      <span className="rapports__rang">{i + 1}</span>
                      <span className="rapports__client">
                        <Link to={`/admin/clients/${c.id}`}>{c.nom}</Link>
                        <small>{formatTelephone(c.phone)} · {c.nb} réservation(s)</small>
                      </span>
                      <strong>{formatFCFA(c.ca)}</strong>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rapports__carte">
              <div className="rapports__titre"><h2>Dépenses par catégorie</h2></div>
              <BarresHorizontales couleur="rouge" vide="Aucune dépense sur la période."
                elements={r.depenses_categories.map((d) => ({ cle: d.cle, libelle: d.cle, valeur: d.total, texte: formatFCFA(d.total) }))} />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
