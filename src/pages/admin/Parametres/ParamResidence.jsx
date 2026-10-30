import { useEffect, useState } from 'react';
import BrouillonRestaure from '../../../components/BrouillonRestaure/BrouillonRestaure.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useBrouillon } from '../../../hooks/useBrouillon.js';
import { lireParametres, enregistrerParametres, viderCacheParametres } from '../../../services/parametres.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { normaliserTelephone, formatTelephone } from '../../../lib/telephone.js';
import './ParamResidence.css';

// WhatsApp : accepte « 77 656 28 04 », « +221… » ou « 221… »
const whatsappNormalise = (v) => normaliserTelephone(v) ?? normaliserTelephone(`+${v.replace(/\D/g, '')}`);

const CHAMPS_VIDES = {
  nom_residence: '', adresse: '', telephone: '', whatsapp: '',
  heure_checkin: '14:00', heure_checkout: '12:00', nuitee_debut: '18:00', nuitee_fin: '12:00', acompte_pourcent: '30',
};

// Onglet « Résidence » : coordonnées, horaires, acompte
export default function ParamResidence() {
  const toast = useToast();
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');
  const [form, setForm, brouillon] = useBrouillon('parametres:residence', CHAMPS_VIDES);
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    viderCacheParametres();
    lireParametres()
      .then((p) => {
        const valeurs = { ...CHAMPS_VIDES, ...Object.fromEntries(Object.keys(CHAMPS_VIDES).map((k) => [k, p[k] ?? CHAMPS_VIDES[k]])) };
        valeurs.telephone = formatTelephone(valeurs.telephone);
        brouillon.marquerEnregistre(valeurs);
        if (!brouillon.restaure) setForm(valeurs); // un brouillon non enregistré garde la priorité
      })
      .catch((err) => setErreurChargement(messageErreur(err, 'Impossible de lire les paramètres.')))
      .finally(() => setChargement(false));
  }, []);

  const maj = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  const valider = () => {
    const e = {};
    if (!form.nom_residence.trim()) e.nom_residence = 'Le nom est obligatoire.';
    if (!form.adresse.trim()) e.adresse = 'L’adresse est obligatoire.';
    if (!normaliserTelephone(form.telephone)) e.telephone = 'Numéro sénégalais invalide (ex : 77 656 28 04).';
    if (!whatsappNormalise(form.whatsapp)) e.whatsapp = 'Numéro WhatsApp invalide (ex : 77 656 28 04).';
    const pct = Number(form.acompte_pourcent);
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) e.acompte_pourcent = 'Entre 0 et 100.';
    setErreurs(e);
    return !Object.keys(e).length;
  };

  const enregistrer = async (ev) => {
    ev.preventDefault();
    if (!valider()) return;
    setEnvoi(true);
    try {
      const tel = normaliserTelephone(form.telephone);
      const valeurs = {
        ...form,
        nom_residence: form.nom_residence.trim(),
        adresse: form.adresse.trim(),
        telephone: formatTelephone(tel), // affiché tel quel sur les reçus
        whatsapp: whatsappNormalise(form.whatsapp).replace('+', ''), // format wa.me : 221776562804
      };
      await enregistrerParametres(valeurs);
      brouillon.marquerEnregistre(valeurs);
      setForm(valeurs);
      toast.succes('Paramètres enregistrés.');
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  // WhatsApp = même numéro que le téléphone
  const copierTelephone = () => {
    const t = normaliserTelephone(form.telephone);
    if (t) setForm((f) => ({ ...f, whatsapp: t.replace('+', '') }));
  };

  if (chargement) return <div className="presid__etat">Chargement…</div>;
  if (erreurChargement) return <div className="presid__etat presid__etat--erreur">{erreurChargement}</div>;

  const champ = (nom) => `champ ${erreurs[nom] ? 'champ--erreur' : ''}`;
  const erreur = (nom) => erreurs[nom] && <small className="champ__erreur">{erreurs[nom]}</small>;

  return (
    <form className="presid" onSubmit={enregistrer} noValidate>
      <BrouillonRestaure visible={brouillon.restaure} onEffacer={brouillon.abandonner} libelle="Revenir aux valeurs enregistrées" />

      <section className="presid__carte">
        <h2>Coordonnées</h2>
        <p className="presid__aide">Affichées sur les reçus, le site de réservation et les messages WhatsApp.</p>
        <div className="presid__grille">
          <div className={champ('nom_residence')}>
            <label htmlFor="pr-nom">Nom de la résidence</label>
            <input id="pr-nom" value={form.nom_residence} onChange={maj('nom_residence')} />
            {erreur('nom_residence')}
          </div>
          <div className={champ('adresse')}>
            <label htmlFor="pr-adr">Adresse</label>
            <input id="pr-adr" value={form.adresse} onChange={maj('adresse')} placeholder="Ziguinchor, Goumel" />
            {erreur('adresse')}
          </div>
          <div className={champ('telephone')}>
            <label htmlFor="pr-tel">Téléphone de la réception</label>
            <input id="pr-tel" type="tel" inputMode="tel" value={form.telephone} onChange={maj('telephone')} />
            {erreur('telephone')}
          </div>
          <div className={champ('whatsapp')}>
            <label htmlFor="pr-wa">Numéro WhatsApp <button type="button" className="presid__lien" onClick={copierTelephone}>= téléphone</button></label>
            <input id="pr-wa" type="tel" inputMode="tel" value={form.whatsapp} onChange={maj('whatsapp')} placeholder="221776562804" />
            {erreur('whatsapp')}
          </div>
        </div>
      </section>

      <section className="presid__carte">
        <h2>Horaires et acompte</h2>
        <p className="presid__aide">Utilisés pour proposer les dates d’arrivée et de départ dans « Nouvelle réservation ».</p>
        <div className="presid__grille presid__grille--5">
          <div className="champ"><label htmlFor="pr-ci">Check-in</label><input id="pr-ci" type="time" value={form.heure_checkin} onChange={maj('heure_checkin')} /></div>
          <div className="champ"><label htmlFor="pr-co">Check-out</label><input id="pr-co" type="time" value={form.heure_checkout} onChange={maj('heure_checkout')} /></div>
          <div className="champ"><label htmlFor="pr-nd">Début de nuitée</label><input id="pr-nd" type="time" value={form.nuitee_debut} onChange={maj('nuitee_debut')} /></div>
          <div className="champ"><label htmlFor="pr-nf">Fin de nuitée</label><input id="pr-nf" type="time" value={form.nuitee_fin} onChange={maj('nuitee_fin')} /></div>
          <div className={champ('acompte_pourcent')}>
            <label htmlFor="pr-ac">Acompte suggéré (%)</label>
            <input id="pr-ac" type="number" min="0" max="100" inputMode="numeric" value={form.acompte_pourcent} onChange={maj('acompte_pourcent')} />
            {erreur('acompte_pourcent')}
          </div>
        </div>
      </section>

      <div className="presid__actions">
        <button type="submit" className="btn btn-rouge" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer les paramètres'}</button>
      </div>
    </form>
  );
}
