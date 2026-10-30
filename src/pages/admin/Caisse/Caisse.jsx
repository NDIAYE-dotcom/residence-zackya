import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import Confirm from '../../../components/Confirm/Confirm.jsx';
import PaiementModal from '../Reservations/PaiementModal.jsx';
import ChoixReservationModal from './ChoixReservationModal.jsx';
import ClotureModal from './ClotureModal.jsx';
import { paiementsDuJour, lireCloture, rouvrirCaisse } from '../../../services/paiements.js';
import { imprimerRecu } from '../../../lib/recu.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, formatDateHeure, MODES_PAIEMENT, TYPES_PAIEMENT, TYPES_ENTREE, TYPES_SORTIE, signeCA } from '../../../lib/format.js';
import { versChampJour } from '../../../lib/dates.js';
import './Caisse.css';

const decalerJour = (jour, n) => { const d = new Date(`${jour}T00:00:00`); d.setDate(d.getDate() + n); return versChampJour(d); };

// Module « Caisse » : mouvements du jour, totaux par mode, encaissement, clôture, reçus
export default function Caisse() {
  const { profile } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const aujourdhui = versChampJour(new Date());
  const jour = params.get('jour') && params.get('jour') <= aujourdhui ? params.get('jour') : aujourdhui;
  const allerAu = (j) => setParams(j === aujourdhui ? {} : { jour: j }, { replace: true });

  const peutEncaisser = ['admin', 'gerant', 'receptionniste'].includes(profile?.role);
  const estAdmin = profile?.role === 'admin';

  const [mouvements, setMouvements] = useState([]);
  const [cloture, setCloture] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [fenetre, setFenetre] = useState(null); // choisir | payer | cloturer | rouvrir
  const [resa, setResa] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    setErreur('');
    try {
      const [m, c] = await Promise.all([paiementsDuJour(jour), lireCloture(jour)]);
      setMouvements(m);
      setCloture(c);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger la caisse.'));
    } finally {
      setChargement(false);
    }
  }, [jour]);

  useEffect(() => { setChargement(true); charger(); }, [charger]);

  // Totaux du jour
  const totaux = useMemo(() => {
    const parMode = {};
    let ca = 0; let cautions = 0; let sorties = 0;
    for (const m of mouvements) {
      const ligne = (parMode[m.mode] ??= { entrees: 0, sorties: 0, nb: 0 });
      ligne.nb += 1;
      if (TYPES_ENTREE.includes(m.type)) ligne.entrees += m.montant; else ligne.sorties += m.montant;
      ca += signeCA(m.type) * m.montant;
      if (m.type === 'caution') cautions += m.montant;
      if (TYPES_SORTIE.includes(m.type)) sorties += m.montant;
    }
    const especes = parMode.especes ? parMode.especes.entrees - parMode.especes.sorties : 0;
    return { parMode, ca, cautions, sorties, especes };
  }, [mouvements]);

  const imprimer = async (id) => {
    try { await imprimerRecu(id); } catch (err) { toast.erreur(messageErreur(err, 'Impossible de générer le reçu.')); }
  };

  const rouvrir = async () => {
    setEnCours(true);
    try {
      await rouvrirCaisse(cloture);
      toast.succes('Caisse rouverte.');
      setFenetre(null);
      charger();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  };

  const estAujourdhui = jour === aujourdhui;
  const libelleJour = new Date(`${jour}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="caisse">
      <header className="caisse__entete">
        <div>
          <h1>Caisse</h1>
          <p className="caisse__jour">{libelleJour}{cloture && <span className="caisse__badge-close">Clôturée</span>}</p>
        </div>
        {peutEncaisser && estAujourdhui && !cloture && (
          <button className="btn btn-rouge" onClick={() => setFenetre('choisir')}>+ Encaisser</button>
        )}
      </header>

      <div className="caisse__navigation">
        <button type="button" className="caisse__fleche" onClick={() => allerAu(decalerJour(jour, -1))} aria-label="Jour précédent">‹</button>
        <button type="button" className="btn btn-contour" onClick={() => allerAu(aujourdhui)} disabled={estAujourdhui}>Aujourd’hui</button>
        <button type="button" className="caisse__fleche" onClick={() => allerAu(decalerJour(jour, 1))} disabled={estAujourdhui} aria-label="Jour suivant">›</button>
        <input type="date" value={jour} max={aujourdhui} aria-label="Choisir un jour" onChange={(e) => e.target.value && allerAu(e.target.value)} />
      </div>

      {chargement ? (
        <div className="caisse__etat">Chargement de la caisse…</div>
      ) : erreur ? (
        <div className="caisse__etat caisse__etat--erreur">
          <p>{erreur}</p>
          <button className="btn btn-contour" onClick={charger}>Réessayer</button>
        </div>
      ) : (
        <>
          <section className="caisse__kpis">
            <div className="caisse__kpi"><span>Encaissé (hors cautions)</span><strong>{formatFCFA(totaux.ca)}</strong></div>
            <div className="caisse__kpi"><span>Cautions reçues</span><strong>{formatFCFA(totaux.cautions)}</strong></div>
            <div className="caisse__kpi caisse__kpi--rouge"><span>Sorties (remboursements, cautions rendues)</span><strong>{formatFCFA(totaux.sorties)}</strong></div>
            <div className="caisse__kpi caisse__kpi--vert"><span>Espèces attendues en caisse</span><strong>{formatFCFA(totaux.especes)}</strong></div>
          </section>

          <div className="caisse__grille">
            {/* ---- Mouvements ---- */}
            <section className="caisse__carte">
              <h2>Mouvements du jour <small>({mouvements.length})</small></h2>
              {!mouvements.length ? (
                <p className="caisse__vide">Aucun paiement enregistré ce jour.</p>
              ) : (
                <ul className="caisse__mouvements">
                  {mouvements.map((m) => {
                    const sortie = TYPES_SORTIE.includes(m.type);
                    return (
                      <li key={m.id}>
                        <div className="caisse__mvt-infos">
                          <strong>
                            {TYPES_PAIEMENT[m.type]} · <Link to={`/admin/reservations/${m.reservation?.id}`}>{m.reservation?.reference}</Link>
                          </strong>
                          <span>{m.reservation?.client?.full_name ?? '—'} · {m.reservation?.studio?.code}</span>
                          <small>
                            {formatDateHeure(m.created_at)} · {MODES_PAIEMENT[m.mode]}
                            {m.reference_transaction ? ` n° ${m.reference_transaction}` : ''}
                            {m.recu?.full_name ? ` · ${m.recu.full_name}` : ''} · reçu n° {m.numero_recu}
                          </small>
                        </div>
                        <div className="caisse__mvt-droite">
                          <strong className={sortie ? 'caisse__sortie' : ''}>{sortie ? '− ' : '+ '}{formatFCFA(m.montant)}</strong>
                          {!sortie && <button type="button" className="caisse__recu" onClick={() => imprimer(m.id)}>Reçu PDF</button>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div className="caisse__colonne">
              {/* ---- Totaux par mode ---- */}
              <section className="caisse__carte">
                <h2>Par mode de paiement</h2>
                {!Object.keys(totaux.parMode).length ? (
                  <p className="caisse__vide">—</p>
                ) : (
                  <table className="caisse__modes">
                    <thead><tr><th>Mode</th><th>Entrées</th><th>Sorties</th><th>Net</th></tr></thead>
                    <tbody>
                      {Object.entries(totaux.parMode).map(([mode, t]) => (
                        <tr key={mode}>
                          <td>{MODES_PAIEMENT[mode]}</td>
                          <td>{formatFCFA(t.entrees)}</td>
                          <td>{t.sorties ? `− ${formatFCFA(t.sorties)}` : '—'}</td>
                          <td><strong>{formatFCFA(t.entrees - t.sorties)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              {/* ---- Clôture ---- */}
              <section className={`caisse__carte caisse__cloture ${cloture ? 'caisse__cloture--faite' : ''}`}>
                <h2>Clôture de la journée</h2>
                {cloture ? (
                  <>
                    <dl>
                      <dt>Espèces attendues</dt><dd>{formatFCFA(cloture.especes_attendues)}</dd>
                      <dt>Espèces comptées</dt><dd>{formatFCFA(cloture.especes_comptees)}</dd>
                      <dt>Écart</dt>
                      <dd className={cloture.ecart === 0 ? 'caisse__ok' : 'caisse__ecart'}>
                        {cloture.ecart === 0 ? 'Aucun' : `${cloture.ecart > 0 ? '+' : '−'} ${formatFCFA(Math.abs(cloture.ecart))}`}
                      </dd>
                      <dt>Chiffre d’affaires</dt><dd>{formatFCFA(cloture.total_encaisse)}</dd>
                    </dl>
                    {cloture.notes && <p className="caisse__notes">{cloture.notes}</p>}
                    <small>Clôturée le {formatDateHeure(cloture.created_at)}{cloture.par?.full_name ? ` par ${cloture.par.full_name}` : ''}</small>
                    {estAdmin && (
                      <button type="button" className="caisse__rouvrir" onClick={() => setFenetre('rouvrir')}>Rouvrir la caisse</button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="caisse__vide">Comptez les espèces en fin de journée et clôturez : plus aucun paiement ne pourra être ajouté à ce jour.</p>
                    <button type="button" className="btn btn-primaire" onClick={() => setFenetre('cloturer')}>Clôturer la journée</button>
                  </>
                )}
              </section>
            </div>
          </div>
        </>
      )}

      {fenetre === 'choisir' && (
        <ChoixReservationModal onFermer={() => setFenetre(null)} onChoisir={(r) => { setResa(r); setFenetre('payer'); }} />
      )}
      {fenetre === 'payer' && resa && (
        <PaiementModal resa={resa} onFermer={() => setFenetre(null)}
          onTermine={(p) => { toast.succes(`${TYPES_PAIEMENT[p.type]} de ${formatFCFA(p.montant)} enregistré (reçu n° ${p.numero_recu}).`); setFenetre(null); charger(); }} />
      )}
      {fenetre === 'cloturer' && (
        <ClotureModal jour={jour} libelleJour={libelleJour} attendues={totaux.especes}
          onFermer={() => setFenetre(null)} onTermine={() => { toast.succes('Journée clôturée.'); setFenetre(null); charger(); }} />
      )}

      <Confirm
        ouvert={fenetre === 'rouvrir'}
        titre="Rouvrir la caisse"
        message="La clôture de ce jour sera supprimée : de nouveaux paiements pourront y être ajoutés, puis il faudra clôturer à nouveau."
        libelle="Rouvrir"
        enCours={enCours}
        onConfirmer={rouvrir}
        onAnnuler={() => setFenetre(null)}
      />
    </div>
  );
}
