import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../../components/Toast/Toast.jsx';
import Confirm from '../../../components/Confirm/Confirm.jsx';
import { listerDocumentsSud, lireEntreprise, supprimerDocumentSud } from '../../../services/sudsoudure.js';
import { viderCacheParametres } from '../../../services/parametres.js';
import { genererPdfSud } from '../../../lib/sudPdf.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatDate, formatFCFA } from '../../../lib/format.js';
import DocumentModal from './DocumentModal.jsx';
import EntrepriseModal from './EntrepriseModal.jsx';
import PdfPret from './PdfPret.jsx';
import './Sudsoudure.css';

const ONGLETS = [['', 'Tous'], ['facture', 'Factures'], ['devis', 'Devis']];

// Factures et devis de SUDSOUDURE ENTREPRISE (admin) : rien à voir avec la comptabilité de Zaquia Résidence
export default function Sudsoudure() {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [entreprise, setEntreprise] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [filtre, setFiltre] = useState({ type: '', texte: '' });
  const [edition, setEdition] = useState(null); // { type, document?, base? }
  const [coordonnees, setCoordonnees] = useState(false);
  const [pdf, setPdf] = useState(null); // { pdf, document }
  const [preparation, setPreparation] = useState(null); // id du document dont le PDF se prépare
  const [aSupprimer, setASupprimer] = useState(null);
  const [suppression, setSuppression] = useState(false);

  const charger = useCallback(async () => {
    setErreur('');
    try {
      const [d, e] = await Promise.all([listerDocumentsSud(), lireEntreprise()]);
      setDocuments(d);
      setEntreprise(e);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger les factures.'));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const visibles = useMemo(() => {
    const q = filtre.texte.trim().toLowerCase();
    return documents.filter((d) => (!filtre.type || d.type === filtre.type)
      && (!q || [d.numero, d.client_nom, d.objet, d.client_telephone].some((v) => v?.toLowerCase().includes(q))));
  }, [documents, filtre]);

  const preparerPdf = async (document) => {
    setPreparation(document.id);
    try {
      setPdf({ pdf: await genererPdfSud(document, entreprise), document });
    } catch (err) {
      toast.erreur(messageErreur(err, 'Le PDF n’a pas pu être créé.'));
    } finally {
      setPreparation(null);
    }
  };

  const apresEnregistrement = (document, avecPdf) => {
    setEdition(null);
    charger();
    if (avecPdf) preparerPdf(document);
  };

  const supprimer = async () => {
    setSuppression(true);
    try {
      await supprimerDocumentSud(aSupprimer);
      toast.succes(`${aSupprimer.numero} supprimé.`);
      charger();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setSuppression(false);
      setASupprimer(null);
    }
  };

  const nouveau = (type) => setEdition({ type });

  return (
    <div className="sud">
      <header className="sud__entete">
        <img src="/sud/logo.png" alt="SUDSOUDURE ENTREPRISE" className="sud__logo" />
        <div className="sud__titre">
          <h1>Factures SUDSOUDURE</h1>
          <p>Factures et devis de SUDSOUDURE ENTREPRISE, à partager en PDF. Séparés de la comptabilité de Zaquia Résidence.</p>
        </div>
        <div className="sud__boutons">
          <button className="btn btn-rouge" onClick={() => nouveau('facture')} disabled={!entreprise}>+ Nouvelle facture</button>
          <button className="btn btn-contour" onClick={() => nouveau('devis')} disabled={!entreprise}>+ Nouveau devis</button>
          <button className="sud__lien" onClick={() => setCoordonnees(true)} disabled={!entreprise}>Coordonnées de l’entreprise</button>
        </div>
      </header>

      {chargement ? (
        <div className="sud__etat">Chargement…</div>
      ) : erreur ? (
        <div className="sud__etat sud__etat--erreur">
          <p>{erreur}</p>
          <button className="btn btn-contour" onClick={() => { setChargement(true); charger(); }}>Réessayer</button>
        </div>
      ) : (
        <section className="sud__carte">
          <div className="sud__filtres">
            <div className="sud__onglets" role="tablist">
              {ONGLETS.map(([k, v]) => (
                <button key={k} type="button" role="tab" aria-selected={filtre.type === k}
                  className={filtre.type === k ? 'sud__onglet--actif' : ''} onClick={() => setFiltre((f) => ({ ...f, type: k }))}>{v}</button>
              ))}
            </div>
            <input type="search" placeholder="Client, numéro, objet…" aria-label="Rechercher"
              value={filtre.texte} onChange={(e) => setFiltre((f) => ({ ...f, texte: e.target.value }))} />
          </div>

          {!documents.length ? (
            <div className="sud__vide">
              <p>Aucune facture pour l’instant.</p>
              <button className="btn btn-rouge" onClick={() => nouveau('facture')}>Créer la première facture</button>
            </div>
          ) : !visibles.length ? (
            <p className="sud__vide">Aucun document ne correspond à la recherche.</p>
          ) : (
            <ul className="sud__liste">
              {visibles.map((d) => (
                <li key={d.id}>
                  <div className="sud__infos">
                    <span className={`sud__type sud__type--${d.type}`}>{d.type === 'facture' ? 'Facture' : 'Devis'} {d.numero}</span>
                    <strong>{d.client_nom}</strong>
                    <small>{formatDate(d.date_document)}{d.objet ? ` · ${d.objet}` : ''}</small>
                  </div>
                  <div className="sud__droite">
                    <strong>{formatFCFA(d.total_ttc)}</strong>
                    <span className="sud__actions">
                      <button type="button" className="sud__pdf" onClick={() => preparerPdf(d)} disabled={preparation === d.id}>
                        {preparation === d.id ? 'PDF…' : 'PDF / Partager'}
                      </button>
                      <button type="button" onClick={() => setEdition({ type: d.type, document: d })}>Modifier</button>
                      {d.type === 'devis'
                        ? <button type="button" onClick={() => setEdition({ type: 'facture', base: d })}>→ Facture</button>
                        : <button type="button" onClick={() => setEdition({ type: 'facture', base: d })}>Copier</button>}
                      <button type="button" className="sud__supprimer" onClick={() => setASupprimer(d)}>Supprimer</button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {edition && (
        <DocumentModal type={edition.type} document={edition.document} base={edition.base} entreprise={entreprise}
          onFermer={() => setEdition(null)} onEnregistre={apresEnregistrement} />
      )}
      {coordonnees && (
        <EntrepriseModal entreprise={entreprise} onFermer={() => setCoordonnees(false)}
          onEnregistre={() => { setCoordonnees(false); viderCacheParametres(); charger(); }} />
      )}
      {pdf && <PdfPret pdf={pdf.pdf} document={pdf.document} onFermer={() => setPdf(null)} />}
      <Confirm
        ouvert={!!aSupprimer}
        titre="Supprimer ce document ?"
        message={aSupprimer && `${aSupprimer.numero} (${aSupprimer.client_nom}, ${formatFCFA(aSupprimer.total_ttc)}) sera supprimé définitivement.`}
        libelle="Supprimer"
        enCours={suppression}
        onConfirmer={supprimer}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  );
}
