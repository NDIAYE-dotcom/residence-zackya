import { useEffect, useState } from 'react';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { exporterSauvegarde, TABLES_SAUVEGARDE } from '../../../services/sauvegarde.js';
import { lireParametres, viderCacheParametres } from '../../../services/parametres.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatDateHeure } from '../../../lib/format.js';
import './Sauvegarde.css';

const JOURS_RAPPEL = 30;

// Onglet « Sauvegarde » : export complet des données, rappel mensuel
export default function Sauvegarde() {
  const toast = useToast();
  const [derniere, setDerniere] = useState(null);
  const [progression, setProgression] = useState(null); // { table, index, total }

  useEffect(() => {
    viderCacheParametres();
    lireParametres().then((p) => setDerniere(p.derniere_sauvegarde ?? null)).catch(() => {});
  }, []);

  const telecharger = async () => {
    try {
      const sauvegarde = await exporterSauvegarde((table, index, total) => setProgression({ table, index, total }));
      const blob = new Blob([JSON.stringify(sauvegarde)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `sauvegarde-zaquia-${sauvegarde.date.slice(0, 10)}.json`;
      lien.click();
      URL.revokeObjectURL(url);
      setDerniere(sauvegarde.date);
      const nb = Object.values(sauvegarde.tables).reduce((t, l) => t + l.length, 0);
      toast.succes(`Sauvegarde téléchargée (${nb} lignes).`);
    } catch (err) {
      toast.erreur(messageErreur(err, 'La sauvegarde a échoué. Réessayez.'));
    } finally {
      setProgression(null);
    }
  };

  const jours = derniere ? Math.floor((Date.now() - new Date(derniere)) / 86400000) : null;
  const enRetard = jours === null || jours >= JOURS_RAPPEL;

  return (
    <section className="sauv">
      <div className={`sauv__etat ${enRetard ? 'sauv__etat--retard' : 'sauv__etat--ok'}`}>
        {derniere
          ? <>Dernière sauvegarde : <strong>{formatDateHeure(derniere)}</strong> (il y a {jours} jour{jours > 1 ? 's' : ''})</>
          : <strong>Aucune sauvegarde n’a encore été faite.</strong>}
        {enRetard && <span> — pensez à en faire une.</span>}
      </div>

      <div className="sauv__carte">
        <h2>Télécharger une sauvegarde complète</h2>
        <p>
          Un fichier contenant <strong>toutes vos données</strong> : studios, tarifs, clients, réservations, paiements,
          dépenses, caisse, ménage, maintenance, inventaire, personnel et journal. À faire <strong>au moins une fois par mois</strong>,
          et à ranger en lieu sûr (clé USB, Google Drive…). Ce fichier contient des données personnelles de clients : ne le partagez pas.
        </p>
        <button type="button" className="btn btn-rouge" onClick={telecharger} disabled={!!progression}>
          {progression ? `Sauvegarde… ${progression.index + 1} / ${progression.total}` : 'Télécharger la sauvegarde'}
        </button>
        {progression && (
          <div className="sauv__barre" aria-hidden="true"><span style={{ width: `${((progression.index + 1) / progression.total) * 100}%` }} /></div>
        )}
        <small>{TABLES_SAUVEGARDE.length} tables · format JSON (lisible et réimportable). Les photos restent stockées dans Supabase.</small>
      </div>
    </section>
  );
}
