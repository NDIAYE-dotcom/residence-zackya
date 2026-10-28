import { useCallback, useEffect, useMemo, useState } from 'react';
import { listerPersonnel, modifierEmploye } from '../../../services/personnel.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import Confirm from '../../../components/Confirm/Confirm.jsx';
import { messageErreur } from '../../../lib/erreurs.js';
import { ROLES_STAFF, formatDate } from '../../../lib/format.js';
import { formatTelephone } from '../../../lib/telephone.js';
import EmployeModal from './EmployeModal.jsx';
import MotDePasseModal from './MotDePasseModal.jsx';
import './Personnel.css';

const initiales = (nom = '') =>
  nom.trim().split(/\s+/).slice(0, 2).map((m) => m[0]?.toUpperCase()).join('') || '?';

// Module « Personnel » (admin) : comptes, rôles, activation
export default function Personnel() {
  const { profile, rechargerProfil } = useAuth();
  const toast = useToast();
  const [employes, setEmployes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreRole, setFiltreRole] = useState('');
  const [edition, setEdition] = useState(null); // { employe } (employe null = création)
  const [motDePasse, setMotDePasse] = useState(null); // employé concerné
  const [confirmation, setConfirmation] = useState(null); // { titre, message, libelle, danger, action }
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    setErreur('');
    try {
      setEmployes(await listerPersonnel());
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger le personnel.'));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return employes.filter((e) =>
      (!filtreRole || e.role === filtreRole) &&
      (!q || e.full_name.toLowerCase().includes(q) || (e.email ?? '').toLowerCase().includes(q) || (e.phone ?? '').includes(q)));
  }, [employes, recherche, filtreRole]);

  const enAttente = employes.filter((e) => !e.actif).length;

  // Applique une modification (rôle, activation) puis met la liste à jour
  const appliquer = async (employe, valeurs, action, message) => {
    setEnCours(true);
    try {
      const maj = await modifierEmploye(employe.id, valeurs, action);
      setEmployes((liste) => liste.map((e) => (e.id === employe.id ? { ...e, ...maj } : e)));
      toast.succes(message);
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnCours(false);
      setConfirmation(null);
    }
  };

  const changerRole = (employe, role) => {
    if (role === employe.role) return;
    const action = () => appliquer(employe, { role }, 'personnel.role', `${employe.full_name} : ${ROLES_STAFF[role]}.`);
    // Donner ou retirer le rôle administrateur = action sensible
    if (role === 'admin' || employe.role === 'admin') {
      setConfirmation({
        titre: role === 'admin' ? 'Nommer administrateur' : 'Retirer le rôle administrateur',
        message: role === 'admin'
          ? `${employe.full_name} aura un accès complet, y compris la gestion du personnel et des paramètres.`
          : `${employe.full_name} perdra l’accès à la gestion du personnel et des paramètres.`,
        libelle: 'Confirmer',
        danger: role !== 'admin',
        action,
      });
    } else {
      action();
    }
  };

  const changerActif = (employe, actif) => {
    if (actif) {
      appliquer(employe, { actif }, 'personnel.active', `${employe.full_name} peut maintenant se connecter.`);
      return;
    }
    setConfirmation({
      titre: 'Désactiver le compte',
      message: `${employe.full_name} ne pourra plus se connecter ni accéder aux données. Son historique est conservé et vous pourrez le réactiver à tout moment.`,
      libelle: 'Désactiver',
      danger: true,
      action: () => appliquer(employe, { actif }, 'personnel.desactive', `Compte de ${employe.full_name} désactivé.`),
    });
  };

  const apresEdition = (employe) => {
    charger();
    if (employe?.id === profile?.id) rechargerProfil();
  };

  return (
    <div className="personnel">
      <header className="personnel__entete">
        <div>
          <h1>Personnel</h1>
          {!chargement && !erreur && <p>{employes.length} compte(s) · {employes.length - enAttente} actif(s)</p>}
        </div>
        <button className="btn btn-rouge" onClick={() => setEdition({ employe: null })}>+ Nouvel employé</button>
      </header>

      {enAttente > 0 && (
        <div className="personnel__alerte">
          <strong>{enAttente} compte(s) inactif(s).</strong> Ces personnes ne peuvent pas se connecter tant que vous
          n’avez pas activé leur compte.
        </div>
      )}

      {employes.length > 0 && (
        <div className="personnel__filtres">
          <input type="search" placeholder="Rechercher un nom, un email, un téléphone…" value={recherche}
            onChange={(e) => setRecherche(e.target.value)} aria-label="Rechercher un employé" />
          <select value={filtreRole} onChange={(e) => setFiltreRole(e.target.value)} aria-label="Filtrer par rôle">
            <option value="">Tous les rôles</option>
            {Object.entries(ROLES_STAFF).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      )}

      {chargement ? (
        <div className="personnel__etat">Chargement du personnel…</div>
      ) : erreur ? (
        <div className="personnel__etat personnel__etat--erreur">
          <p>{erreur}</p>
          <button className="btn btn-contour" onClick={charger}>Réessayer</button>
        </div>
      ) : !visibles.length ? (
        <div className="personnel__etat">
          {employes.length ? 'Aucun employé ne correspond à votre recherche.' : 'Aucun compte pour le moment.'}
        </div>
      ) : (
        <ul className="personnel__liste">
          {visibles.map((e) => {
            const moi = e.id === profile?.id;
            return (
              <li key={e.id} className={`employe ${e.actif ? '' : 'employe--inactif'}`}>
                <div className="employe__identite">
                  <span className={`employe__avatar employe__avatar--${e.role}`}>{initiales(e.full_name)}</span>
                  <div>
                    <strong>{e.full_name || 'Sans nom'} {moi && <span className="employe__moi">vous</span>}</strong>
                    <span>{e.email ?? '—'}</span>
                    <small>{e.phone ? formatTelephone(e.phone) : 'Pas de téléphone'} · depuis le {formatDate(e.created_at)}</small>
                  </div>
                </div>

                <select className="employe__role" value={e.role} disabled={moi || enCours}
                  onChange={(ev) => changerRole(e, ev.target.value)}
                  aria-label={`Rôle de ${e.full_name}`}
                  title={moi ? 'Vous ne pouvez pas changer votre propre rôle' : undefined}>
                  {Object.entries(ROLES_STAFF).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>

                <label className={`interrupteur ${moi ? 'interrupteur--bloque' : ''}`}
                  title={moi ? 'Vous ne pouvez pas désactiver votre propre compte' : undefined}>
                  <input type="checkbox" checked={e.actif} disabled={moi || enCours}
                    onChange={(ev) => changerActif(e, ev.target.checked)} />
                  <span className="interrupteur__piste" aria-hidden="true" />
                  <span className="interrupteur__texte">{e.actif ? 'Actif' : 'Inactif'}</span>
                </label>

                <div className="employe__actions">
                  <button className="btn btn-contour" onClick={() => setEdition({ employe: e })}>Modifier</button>
                  <button className="btn btn-contour" onClick={() => setMotDePasse(e)}>Mot de passe</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {edition && (
        <EmployeModal employe={edition.employe} onFermer={() => setEdition(null)} onEnregistre={apresEdition} />
      )}

      {motDePasse && <MotDePasseModal employe={motDePasse} onFermer={() => setMotDePasse(null)} />}

      <Confirm
        ouvert={!!confirmation}
        titre={confirmation?.titre}
        message={confirmation?.message}
        libelle={confirmation?.libelle}
        danger={confirmation?.danger}
        enCours={enCours}
        onConfirmer={() => confirmation?.action()}
        onAnnuler={() => setConfirmation(null)}
      />
    </div>
  );
}
