import { useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import BrouillonRestaure from '../../../components/BrouillonRestaure/BrouillonRestaure.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useBrouillon } from '../../../hooks/useBrouillon.js';
import { enregistrerDocumentSud } from '../../../services/sudsoudure.js';
import { totauxSud } from '../../../lib/sudPdf.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA } from '../../../lib/format.js';
import { maintenantDakar, versChampJour } from '../../../lib/dates.js';
import './DocumentModal.css';

const UNITES = ['u', 'forfait', 'm²', 'm³', 'ml', 'kg', 'tonne', 'sac', 'barre', 'jour', 'heure'];
const nouvelleCle = () => Math.random().toString(36).slice(2, 10);
const ligneVide = () => ({ cle: nouvelleCle(), designation: '', quantite: '1', unite: 'u', prix_unitaire: '' });
const versForm = (l) => ({ cle: nouvelleCle(), designation: l.designation, quantite: String(l.quantite), unite: l.unite ?? '', prix_unitaire: String(l.prix_unitaire) });

/**
 * Facture ou devis SUDSOUDURE.
 * document = modification ; base = copie d'un autre document (ex. devis → facture) ; sinon nouveau.
 */
export default function DocumentModal({ type, document, base, entreprise, onFermer, onEnregistre }) {
  const toast = useToast();
  const source = document ?? base;
  const cleBrouillon = document ? `sud:${document.id}` : base ? `sud:copie:${base.id}:${type}` : `sud:nouveau:${type}`;
  const [form, setForm, brouillon] = useBrouillon(cleBrouillon, () => ({
    date_document: document?.date_document ?? versChampJour(maintenantDakar()),
    client_nom: source?.client_nom ?? '',
    client_telephone: source?.client_telephone ?? '',
    client_adresse: source?.client_adresse ?? '',
    objet: source?.objet ?? '',
    lignes: source?.lignes?.length ? source.lignes.map(versForm) : [ligneVide()],
    remise: source?.remise ? String(source.remise) : '',
    tva: source?.tva ?? false,
    tampon: source?.tampon ?? true,
    notes: source && (document || source.type === type) ? (source.notes ?? '')
      : type === 'devis' ? 'Devis valable 30 jours.' : (entreprise.conditions ?? ''),
  }));
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const maj = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const majLigne = (cle, champ) => (e) => setForm((f) => ({ ...f, lignes: f.lignes.map((l) => (l.cle === cle ? { ...l, [champ]: e.target.value } : l)) }));
  const ajouterLigne = () => setForm((f) => ({ ...f, lignes: [...f.lignes, ligneVide()] }));
  const retirerLigne = (cle) => setForm((f) => ({ ...f, lignes: f.lignes.length > 1 ? f.lignes.filter((l) => l.cle !== cle) : f.lignes }));

  const lignesNombres = form.lignes.map((l) => ({ ...l, quantite: Number(l.quantite) || 0, prix_unitaire: Number(l.prix_unitaire) || 0 }));
  const t = totauxSud({ lignes: lignesNombres, remise: form.remise, tva: form.tva });
  const libelle = type === 'facture' ? 'facture' : 'devis';

  const enregistrer = async (avecPdf) => {
    setErreur('');
    if (form.client_nom.trim().length < 2) return setErreur('Indiquez le nom du client.');
    if (!form.date_document) return setErreur('Indiquez la date.');
    for (const [i, l] of form.lignes.entries()) {
      const q = Number(l.quantite);
      const pu = Number(l.prix_unitaire);
      if (!l.designation.trim()) return setErreur(`Ligne ${i + 1} : décrivez la prestation.`);
      if (!(q > 0)) return setErreur(`Ligne ${i + 1} : quantité invalide.`);
      if (l.prix_unitaire === '' || !Number.isInteger(pu) || pu < 0) return setErreur(`Ligne ${i + 1} : prix unitaire invalide (nombre entier en FCFA).`);
    }
    const remise = form.remise === '' ? 0 : Number(form.remise);
    if (!Number.isInteger(remise) || remise < 0) return setErreur('Remise invalide (nombre entier en FCFA).');
    if (remise > t.brut) return setErreur('La remise dépasse le total.');

    setEnvoi(true);
    try {
      const valeurs = {
        date_document: form.date_document,
        client_nom: form.client_nom.trim(),
        client_telephone: form.client_telephone.trim() || null,
        client_adresse: form.client_adresse.trim() || null,
        objet: form.objet.trim() || null,
        lignes: form.lignes.map((l) => ({
          designation: l.designation.trim(), quantite: Number(l.quantite), unite: l.unite.trim(), prix_unitaire: Number(l.prix_unitaire),
        })),
        remise,
        tva: form.tva,
        tampon: form.tampon,
        notes: form.notes.trim() || null,
      };
      if (!document) valeurs.type = type;
      const enregistre = await enregistrerDocumentSud(document?.id, valeurs);
      brouillon.marquerEnregistre();
      toast.succes(`${type === 'facture' ? 'Facture' : 'Devis'} ${enregistre.numero} enregistré${type === 'facture' ? 'e' : ''}.`);
      onEnregistre(enregistre, avecPdf);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const titre = document ? `Modifier ${document.numero}` : base ? `Nouveau${type === 'facture' ? 'elle facture' : ' devis'} (copie de ${base.numero})`
    : type === 'facture' ? 'Nouvelle facture' : 'Nouveau devis';

  return (
    <Modal ouvert large titre={titre} onFermer={envoi ? undefined : onFermer}>
      <form className="sudform" onSubmit={(e) => { e.preventDefault(); enregistrer(true); }} noValidate>
        <BrouillonRestaure visible={brouillon.restaure} onEffacer={brouillon.abandonner} />

        <fieldset className="sudform__bloc">
          <legend>Client</legend>
          <div className="sudform__grille">
            <div className="champ">
              <label htmlFor="sud-client">Nom du client *</label>
              <input id="sud-client" value={form.client_nom} onChange={maj('client_nom')} placeholder="Ex : Mamadou Diallo / Société X" />
            </div>
            <div className="champ">
              <label htmlFor="sud-tel">Téléphone</label>
              <input id="sud-tel" type="tel" inputMode="tel" value={form.client_telephone} onChange={maj('client_telephone')} />
            </div>
            <div className="champ">
              <label htmlFor="sud-adresse">Adresse</label>
              <input id="sud-adresse" value={form.client_adresse} onChange={maj('client_adresse')} />
            </div>
            <div className="champ">
              <label htmlFor="sud-date">Date</label>
              <input id="sud-date" type="date" value={form.date_document} onChange={maj('date_document')} />
            </div>
          </div>
          <div className="champ">
            <label htmlFor="sud-objet">Objet</label>
            <input id="sud-objet" value={form.objet} onChange={maj('objet')} placeholder="Ex : Construction d’un portail métallique" />
          </div>
        </fieldset>

        <fieldset className="sudform__bloc">
          <legend>Prestations</legend>
          <div className="sudform__lignes">
            <div className="sudform__ligne sudform__ligne--entete" aria-hidden="true">
              <span>Désignation</span><span>Qté</span><span>Unité</span><span>Prix unitaire</span><span>Montant</span><span />
            </div>
            {form.lignes.map((l, i) => (
              <div className="sudform__ligne" key={l.cle}>
                <input aria-label={`Ligne ${i + 1} : désignation`} value={l.designation} onChange={majLigne(l.cle, 'designation')} placeholder="Prestation ou fourniture" />
                <input aria-label={`Ligne ${i + 1} : quantité`} type="number" min="0" step="any" inputMode="decimal" value={l.quantite} onChange={majLigne(l.cle, 'quantite')} />
                <input aria-label={`Ligne ${i + 1} : unité`} list="sud-unites" value={l.unite} onChange={majLigne(l.cle, 'unite')} />
                <input aria-label={`Ligne ${i + 1} : prix unitaire`} type="number" min="0" step="1" inputMode="numeric" value={l.prix_unitaire} onChange={majLigne(l.cle, 'prix_unitaire')} placeholder="FCFA" />
                <strong className="sudform__montant">{formatFCFA(Math.round((Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0)))}</strong>
                <button type="button" className="sudform__retirer" onClick={() => retirerLigne(l.cle)} disabled={form.lignes.length === 1} aria-label={`Retirer la ligne ${i + 1}`}>×</button>
              </div>
            ))}
            <datalist id="sud-unites">{UNITES.map((u) => <option key={u} value={u} />)}</datalist>
          </div>
          <button type="button" className="btn btn-contour sudform__ajouter" onClick={ajouterLigne}>+ Ajouter une ligne</button>
        </fieldset>

        <div className="sudform__bas">
          <div className="sudform__options">
            <div className="champ">
              <label htmlFor="sud-remise">Remise (FCFA)</label>
              <input id="sud-remise" type="number" min="0" step="1" inputMode="numeric" value={form.remise} onChange={maj('remise')} />
            </div>
            <label className="sudform__case"><input type="checkbox" checked={form.tva} onChange={maj('tva')} /> Appliquer la TVA (18 %)</label>
            <label className="sudform__case"><input type="checkbox" checked={form.tampon} onChange={maj('tampon')} /> Tampon et signature sur le PDF</label>
            <div className="champ">
              <label htmlFor="sud-notes">Conditions et remarques</label>
              <textarea id="sud-notes" rows={2} value={form.notes} onChange={maj('notes')} />
            </div>
          </div>
          <dl className="sudform__totaux">
            {Number(form.remise) > 0 && (<><dt>Total brut</dt><dd>{formatFCFA(t.brut)}</dd><dt>Remise</dt><dd>− {formatFCFA(Number(form.remise))}</dd></>)}
            {form.tva && (<><dt>Total HT</dt><dd>{formatFCFA(t.ht)}</dd><dt>TVA 18 %</dt><dd>{formatFCFA(t.tva)}</dd></>)}
            <dt className="sudform__total">{type === 'facture' ? 'Net à payer' : 'Total'}</dt>
            <dd className="sudform__total">{formatFCFA(t.ttc)}</dd>
          </dl>
        </div>

        {erreur && <p className="sudform__erreur" role="alert">{erreur}</p>}

        <div className="sudform__actions">
          <button type="button" className="btn btn-contour" onClick={() => { brouillon.abandonner(); onFermer(); }} disabled={envoi}>Annuler</button>
          <button type="button" className="btn btn-contour" onClick={() => enregistrer(false)} disabled={envoi}>Enregistrer</button>
          <button type="submit" className="btn btn-rouge" disabled={envoi}>{envoi ? 'Enregistrement…' : `Enregistrer et créer le PDF`}</button>
        </div>
        <p className="sudform__mention">Ce {libelle} ne concerne pas Zaquia Résidence : il n’apparaît ni dans la caisse ni dans les rapports.</p>
      </form>
    </Modal>
  );
}
