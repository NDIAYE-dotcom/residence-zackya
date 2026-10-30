import { useEffect, useState } from 'react';
import { calendrierStudio } from '../../../services/public.js';
import { versChampJour } from '../../../lib/dates.js';
import './CalendrierDispo.css';

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Calendrier du mois : libre / partiel / complet (aucune information sur les clients)
// onChoisir(jour « AAAA-MM-JJ ») : clic sur un jour libre ou partiel à venir
export default function CalendrierDispo({ studioId, onChoisir }) {
  const [mois, setMois] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [jours, setJours] = useState({});
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  const aujourdhui = versChampJour(new Date());
  const premierMoisActuel = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    setErreur(false);
    const dernier = new Date(mois.getFullYear(), mois.getMonth() + 1, 0);
    calendrierStudio(studioId, versChampJour(mois), versChampJour(dernier))
      .then((liste) => { if (!annule) setJours(Object.fromEntries(liste.map((j) => [j.jour, j.occupation]))); })
      .catch(() => { if (!annule) setErreur(true); })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [studioId, mois]);

  // Cases du mois, en commençant le lundi
  const decalage = (mois.getDay() + 6) % 7;
  const nbJours = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate();
  const cases = [
    ...Array.from({ length: decalage }, () => null),
    ...Array.from({ length: nbJours }, (_, i) => versChampJour(new Date(mois.getFullYear(), mois.getMonth(), i + 1))),
  ];

  const changerMois = (n) => setMois((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <div className="caldispo">
      <div className="caldispo__entete">
        <button type="button" onClick={() => changerMois(-1)} disabled={mois <= premierMoisActuel} aria-label="Mois précédent">‹</button>
        <strong>{mois.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong>
        <button type="button" onClick={() => changerMois(1)} aria-label="Mois suivant">›</button>
      </div>

      {erreur ? (
        <p className="caldispo__erreur">Calendrier indisponible pour le moment.</p>
      ) : (
        <div className={`caldispo__grille ${chargement ? 'caldispo__grille--chargement' : ''}`} role="grid" aria-label="Disponibilités du mois">
          {JOURS.map((j) => <span key={j} className="caldispo__jour-semaine">{j}</span>)}
          {cases.map((jour, i) => {
            if (!jour) return <span key={`v${i}`} />;
            const passe = jour < aujourdhui;
            const etat = passe ? 'passe' : (jours[jour] ?? 'libre');
            const cliquable = !passe && etat !== 'complet' && onChoisir;
            const libelle = { libre: 'libre', partiel: 'partiellement occupé', complet: 'complet', passe: 'passé' }[etat];
            return (
              <button key={jour} type="button" role="gridcell"
                className={`caldispo__case caldispo__case--${etat} ${jour === aujourdhui ? 'caldispo__case--aujourdhui' : ''}`}
                disabled={!cliquable} onClick={() => onChoisir(jour)}
                aria-label={`${new Date(`${jour}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} : ${libelle}`}>
                {Number(jour.slice(8))}
              </button>
            );
          })}
        </div>
      )}

      <div className="caldispo__legende">
        <span><i className="caldispo__case--libre" />Libre</span>
        <span><i className="caldispo__case--partiel" />Arrivée / départ</span>
        <span><i className="caldispo__case--complet" />Complet</span>
      </div>
    </div>
  );
}
