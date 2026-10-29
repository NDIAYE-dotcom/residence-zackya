import { useEffect, useState } from 'react';
import { useToast } from '../../../components/Toast/Toast.jsx';
import BrouillonRestaure from '../../../components/BrouillonRestaure/BrouillonRestaure.jsx';
import { useBrouillon } from '../../../hooks/useBrouillon.js';
import { listerTarifs, enregistrerTarifs } from '../../../services/studios.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { FORMULES, DUREES_FORMULE, formatFCFA } from '../../../lib/format.js';
import './StudioTarifs.css';

// Ce que couvre 1 unité de chaque formule
const UNITE = {
  heure: 'par heure', demi_journee: 'par tranche de 6 h', journee: 'par tranche de 12 h',
  nuitee: 'par nuit', semaine: 'par semaine (7 jours)', mois: 'par mois (30 jours)',
};

const grilleVide = () => Object.keys(FORMULES).map((formule) => ({
  formule, prix: '', duree_heures: DUREES_FORMULE[formule], actif: true, existe: false,
}));

const versGrille = (tarifs) => grilleVide().map((l) => {
  const t = tarifs.find((x) => x.formule === l.formule);
  return t ? { ...l, prix: String(t.prix), duree_heures: t.duree_heures, actif: t.actif, existe: true } : l;
});

// Onglet Tarifs : un prix par formule, activer/désactiver, copier la grille d'un autre studio
export default function StudioTarifs({ studio, studios, setOccupe, onEnregistre }) {
  const toast = useToast();
  const [lignes, setLignes, brouillon] = useBrouillon(`tarifs:${studio.id}`, grilleVide);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [info, setInfo] = useState('');
  const [essai, setEssai] = useState(0); // recharge les tarifs enregistrés

  useEffect(() => {
    let annule = false;
    listerTarifs(studio.id)
      .then((t) => {
        if (annule || brouillon.restaure) return; // un brouillon non enregistré garde la priorité
        const grille = versGrille(t);
        brouillon.marquerEnregistre(grille);
        setLignes(grille);
      })
      .catch((err) => { if (!annule) setErreur(messageErreur(err, 'Impossible de charger les tarifs.')); })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [studio.id, essai]);

  const maj = (formule, champ, valeur) =>
    setLignes((ls) => ls.map((l) => (l.formule === formule ? { ...l, [champ]: valeur } : l)));

  // « Dupliquer la grille tarifaire » : remplit le formulaire, rien n'est enregistré avant le clic
  const sources = studios.filter((s) => s.id !== studio.id && s.tarifs?.length);
  const copier = async (id) => {
    if (!id) return;
    try {
      const tarifs = await listerTarifs(id);
      setLignes((ls) => ls.map((l) => {
        const t = tarifs.find((x) => x.formule === l.formule);
        return t ? { ...l, prix: String(t.prix), duree_heures: t.duree_heures, actif: t.actif } : l;
      }));
      const source = studios.find((s) => s.id === id);
      setInfo(`Grille de ${source?.code} copiée. Vérifiez les prix puis cliquez sur « Enregistrer les tarifs ».`);
    } catch (err) {
      toast.erreur(messageErreur(err));
    }
  };

  const enregistrer = async () => {
    const aEnvoyer = [];
    for (const l of lignes) {
      if (l.prix === '' && !l.existe) continue; // formule jamais tarifée et laissée vide
      const prix = Number(l.prix);
      if (l.prix === '' || !Number.isInteger(prix) || prix < 0) {
        return toast.erreur(`Prix invalide pour « ${FORMULES[l.formule]} » : nombre entier en FCFA.`);
      }
      aEnvoyer.push({ formule: l.formule, prix, duree_heures: l.duree_heures, actif: l.actif });
    }
    if (!aEnvoyer.length) return toast.erreur('Saisissez au moins un prix.');

    setEnvoi(true);
    setOccupe(true);
    try {
      await enregistrerTarifs(studio.id, aEnvoyer);
      const enregistrees = lignes.map((l) => (aEnvoyer.some((a) => a.formule === l.formule) ? { ...l, existe: true } : l));
      brouillon.marquerEnregistre(enregistrees);
      setLignes(enregistrees);
      setInfo('');
      toast.succes(`Tarifs de ${studio.code} enregistrés.`);
      onEnregistre();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
      setOccupe(false);
    }
  };

  if (chargement) return <p className="tarifs__etat">Chargement des tarifs…</p>;
  if (erreur) return <p className="tarifs__etat tarifs__etat--erreur">{erreur}</p>;

  return (
    <div className="tarifs">
      <BrouillonRestaure visible={brouillon.restaure} libelle="Revenir aux tarifs enregistrés"
        onEffacer={() => { brouillon.abandonner(); setChargement(true); setEssai((n) => n + 1); }} />
      <p className="tarifs__aide">
        Prix en FCFA pour <strong>une unité</strong> de chaque formule. Le prix final est calculé automatiquement
        selon la durée du séjour. Une formule vide ou désactivée n’est pas proposée aux clients.
      </p>

      {sources.length > 0 && (
        <div className="champ tarifs__copie">
          <label htmlFor="tarifs-source">Dupliquer la grille tarifaire d’un autre studio</label>
          <select id="tarifs-source" value="" onChange={(e) => copier(e.target.value)}>
            <option value="">Choisir un studio…</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.nom}</option>)}
          </select>
        </div>
      )}

      {info && <div className="tarifs__info">{info}</div>}

      <div className="tarifs__liste">
        {lignes.map((l) => (
          <div key={l.formule} className={`tarifs__ligne ${l.actif ? '' : 'tarifs__ligne--inactive'}`}>
            <div className="tarifs__formule">
              <strong>{FORMULES[l.formule]}</strong>
              <span>{UNITE[l.formule]}</span>
            </div>
            <div className="tarifs__prix">
              <input type="number" min="0" step="500" inputMode="numeric" placeholder="—"
                value={l.prix} onChange={(e) => maj(l.formule, 'prix', e.target.value)}
                aria-label={`Prix ${FORMULES[l.formule]}`} />
              <span>FCFA</span>
            </div>
            <span className="tarifs__apercu">{l.prix !== '' && Number(l.prix) >= 0 ? formatFCFA(Number(l.prix)) : ''}</span>
            <label className="tarifs__actif">
              <input type="checkbox" checked={l.actif} onChange={(e) => maj(l.formule, 'actif', e.target.checked)} />
              {l.actif ? 'Active' : 'Désactivée'}
            </label>
          </div>
        ))}
      </div>

      <div className="tarifs__actions">
        <button type="button" className="btn btn-rouge" onClick={enregistrer} disabled={envoi}>
          {envoi ? 'Enregistrement…' : 'Enregistrer les tarifs'}
        </button>
      </div>
    </div>
  );
}
