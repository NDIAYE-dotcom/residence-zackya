import { useEffect, useState } from 'react';
import { rechercherClients } from '../../../services/clients.js';
import { formatFCFA, MODES_PAIEMENT, SOURCES_RESERVATION, NATIONALITES } from '../../../lib/format.js';
import { formatTelephone } from '../../../lib/telephone.js';
import './EtapeClient.css';

// Sources possibles pour une réservation saisie par le personnel (« site » = réservations en ligne)
const SOURCES_STAFF = Object.entries(SOURCES_RESERVATION).filter(([k]) => k !== 'site');
// PayDunya = paiement en ligne uniquement
const MODES_STAFF = Object.entries(MODES_PAIEMENT).filter(([k]) => k !== 'paydunya');

// Étape 3 : client (existant ou nouveau), détails, remise / caution / acompte
export default function EtapeClient({
  studio, params, net, client, setClient, modeClient, setModeClient,
  nouveauClient, setNouveauClient, details, setDetails, envoi, onRetour, onValider,
}) {
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [recherchant, setRecherchant] = useState(false);

  // Recherche de clients existants (300 ms après la dernière frappe)
  useEffect(() => {
    if (modeClient !== 'existant' || client || recherche.trim().length < 2) { setResultats([]); return; }
    let annule = false;
    setRecherchant(true);
    const minuteur = setTimeout(async () => {
      try {
        const res = await rechercherClients({ recherche });
        if (!annule) setResultats(res.clients.slice(0, 6));
      } catch {
        if (!annule) setResultats([]);
      } finally {
        if (!annule) setRecherchant(false);
      }
    }, 300);
    return () => { annule = true; clearTimeout(minuteur); };
  }, [recherche, modeClient, client]);

  const maj = (champ) => (e) =>
    setDetails((d) => ({ ...d, [champ]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const majClient = (champ) => (e) => setNouveauClient((c) => ({ ...c, [champ]: e.target.value }));

  const pourcent = Number(params?.acompte_pourcent ?? 30);
  const acompteSuggere = Math.ceil((net * pourcent) / 100 / 100) * 100; // arrondi à 100 FCFA
  const tropDePersonnes = Number(details.nbPersonnes) > studio.capacite;

  return (
    <div className="eclient">
      {/* ---------- Client ---------- */}
      <section>
        <h2>Client</h2>
        {client ? (
          <div className={`eclient__choisi ${client.liste_noire ? 'eclient__choisi--noire' : ''}`}>
            <div>
              <strong>{client.full_name}</strong>
              <span>{formatTelephone(client.phone)}{client.nb_reservations ? ` · ${client.nb_reservations} réservation(s)` : ' · nouveau client'}</span>
              {client.liste_noire && <small>⚠ Liste noire : {client.liste_noire_motif || 'sans motif'}</small>}
            </div>
            <button type="button" className="btn btn-contour" onClick={() => { setClient(null); setDetails((d) => ({ ...d, listeNoireAcceptee: false })); }}>
              Changer
            </button>
          </div>
        ) : (
          <>
            <div className="eclient__onglets">
              <button type="button" className={modeClient === 'existant' ? 'eclient__onglet--actif' : ''} onClick={() => setModeClient('existant')}>
                Client existant
              </button>
              <button type="button" className={modeClient === 'nouveau' ? 'eclient__onglet--actif' : ''} onClick={() => setModeClient('nouveau')}>
                Nouveau client
              </button>
            </div>

            {modeClient === 'existant' ? (
              <div className="eclient__recherche">
                <input type="search" placeholder="Nom ou téléphone (2 caractères minimum)…" value={recherche} autoFocus
                  onChange={(e) => setRecherche(e.target.value)} aria-label="Rechercher un client" />
                {recherchant && <p className="eclient__info">Recherche…</p>}
                {!recherchant && recherche.trim().length >= 2 && !resultats.length && (
                  <p className="eclient__info">
                    Aucun client trouvé.{' '}
                    <button type="button" className="eclient__lien" onClick={() => setModeClient('nouveau')}>Créer un nouveau client</button>
                  </p>
                )}
                {resultats.length > 0 && (
                  <ul className="eclient__resultats">
                    {resultats.map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => setClient(c)}>
                          <strong>{c.full_name}</strong>
                          {c.liste_noire && <span className="eclient__badge-noire">Liste noire</span>}
                          <small>{formatTelephone(c.phone)} · {c.nb_reservations} réservation(s)</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="eclient__grille">
                <div className="champ">
                  <label htmlFor="nc-nom">Nom complet *</label>
                  <input id="nc-nom" value={nouveauClient.full_name} onChange={majClient('full_name')} placeholder="Fatou Sané" autoFocus />
                </div>
                <div className="champ">
                  <label htmlFor="nc-tel">Téléphone *</label>
                  <input id="nc-tel" type="tel" inputMode="tel" value={nouveauClient.phone} onChange={majClient('phone')} placeholder="77 123 45 67" />
                </div>
                <div className="champ">
                  <label htmlFor="nc-nat">Nationalité</label>
                  <input id="nc-nat" list="nc-nationalites" value={nouveauClient.nationalite} onChange={majClient('nationalite')} />
                  <datalist id="nc-nationalites">{NATIONALITES.map((n) => <option key={n} value={n} />)}</datalist>
                </div>
              </div>
            )}
          </>
        )}

        {client?.liste_noire && (
          <label className="eclient__confirmation">
            <input type="checkbox" checked={details.listeNoireAcceptee} onChange={maj('listeNoireAcceptee')} />
            Je confirme vouloir réserver pour ce client malgré la liste noire.
          </label>
        )}
      </section>

      {/* ---------- Détails ---------- */}
      <section>
        <h2>Détails</h2>
        <div className="eclient__grille">
          <div className="champ">
            <label htmlFor="nr-pers">Nombre de personnes</label>
            <input id="nr-pers" type="number" min="1" inputMode="numeric" value={details.nbPersonnes} onChange={maj('nbPersonnes')} />
            {tropDePersonnes && <small className="eclient__alerte">Capacité du studio : {studio.capacite} pers.</small>}
          </div>
          <div className="champ">
            <label htmlFor="nr-source">Source</label>
            <select id="nr-source" value={details.source} onChange={maj('source')}>
              {SOURCES_STAFF.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <label className="eclient__case">
            <input type="checkbox" checked={details.confirmer} onChange={maj('confirmer')} />
            <span><strong>Confirmer directement</strong><small>Sinon : « En attente » (à confirmer plus tard)</small></span>
          </label>
        </div>
      </section>

      {/* ---------- Paiement ---------- */}
      <section>
        <h2>Paiement</h2>
        <div className="eclient__grille">
          <div className="champ">
            <label htmlFor="nr-remise">Remise (FCFA)</label>
            <input id="nr-remise" type="number" min="0" step="500" inputMode="numeric" placeholder="0" value={details.remise} onChange={maj('remise')} />
          </div>
          <div className="champ">
            <label htmlFor="nr-caution">Caution (FCFA)</label>
            <input id="nr-caution" type="number" min="0" step="1000" inputMode="numeric" placeholder="0" value={details.caution} onChange={maj('caution')} />
          </div>
          <div className="champ">
            <label htmlFor="nr-acompte">Acompte reçu (FCFA)</label>
            <input id="nr-acompte" type="number" min="0" step="500" inputMode="numeric" placeholder="0" value={details.acompte} onChange={maj('acompte')} />
            {net > 0 && (
              <button type="button" className="eclient__lien" onClick={() => setDetails((d) => ({ ...d, acompte: String(acompteSuggere) }))}>
                {pourcent} % : {formatFCFA(acompteSuggere)}
              </button>
            )}
          </div>
        </div>

        {Number(details.acompte) > 0 && (
          <div className="eclient__grille eclient__grille--2">
            <div className="champ">
              <label htmlFor="nr-mode">Mode de paiement de l’acompte</label>
              <select id="nr-mode" value={details.mode} onChange={maj('mode')}>
                {MODES_STAFF.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {details.mode !== 'especes' && (
              <div className="champ">
                <label htmlFor="nr-ref">N° de transaction</label>
                <input id="nr-ref" value={details.referenceTransaction} onChange={maj('referenceTransaction')} placeholder="Ex : identifiant Wave / OM" />
              </div>
            )}
          </div>
        )}

        <div className="champ eclient__notes">
          <label htmlFor="nr-notes">Notes</label>
          <textarea id="nr-notes" rows={2} value={details.notes} onChange={maj('notes')} placeholder="Heure d’arrivée prévue, demande particulière…" />
        </div>
      </section>

      <div className="nresa__nav">
        <button type="button" className="btn btn-contour" onClick={onRetour} disabled={envoi}>← Studio</button>
        <button type="button" className="btn btn-rouge" onClick={onValider} disabled={envoi}>
          {envoi ? 'Enregistrement…' : 'Créer la réservation'}
        </button>
      </div>
    </div>
  );
}
