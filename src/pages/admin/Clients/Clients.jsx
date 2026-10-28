import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rechercherClients, TAILLE_PAGE } from '../../../services/clients.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, formatDate } from '../../../lib/format.js';
import { formatTelephone } from '../../../lib/telephone.js';
import ClientModal from './ClientModal.jsx';
import './Clients.css';

// Module « Clients » : recherche, liste paginée, création
export default function Clients() {
  const navigate = useNavigate();
  const [recherche, setRecherche] = useState('');
  const [listeNoire, setListeNoire] = useState(false);
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [chargementPlus, setChargementPlus] = useState(false);
  const [erreur, setErreur] = useState('');
  const [essai, setEssai] = useState(0); // relance après une erreur
  const [creation, setCreation] = useState(false);

  // Nouvelle recherche (attend 300 ms après la dernière frappe)
  useEffect(() => {
    let annule = false;
    setChargement(true);
    const minuteur = setTimeout(async () => {
      setErreur('');
      try {
        const res = await rechercherClients({ recherche, listeNoire, page: 0 });
        if (annule) return;
        setClients(res.clients);
        setTotal(res.total);
        setPage(0);
      } catch (err) {
        if (!annule) setErreur(messageErreur(err, 'Impossible de charger les clients.'));
      } finally {
        if (!annule) setChargement(false);
      }
    }, 300);
    return () => { annule = true; clearTimeout(minuteur); };
  }, [recherche, listeNoire, essai]);

  const afficherPlus = async () => {
    setChargementPlus(true);
    try {
      const res = await rechercherClients({ recherche, listeNoire, page: page + 1 });
      setClients((liste) => [...liste, ...res.clients]);
      setPage((p) => p + 1);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setChargementPlus(false);
    }
  };

  const ouvrir = (id) => navigate(`/admin/clients/${id}`);
  const filtre = recherche.trim() || listeNoire;

  return (
    <div className="clients">
      <header className="clients__entete">
        <div>
          <h1>Clients</h1>
          {!chargement && !erreur && <p>{total} client(s){filtre ? ' trouvé(s)' : ''}</p>}
        </div>
        <button className="btn btn-rouge" onClick={() => setCreation(true)}>+ Nouveau client</button>
      </header>

      <div className="clients__filtres">
        <input type="search" placeholder="Nom, téléphone ou email…" value={recherche} autoFocus
          onChange={(e) => setRecherche(e.target.value)} aria-label="Rechercher un client" />
        <label className="clients__noire">
          <input type="checkbox" checked={listeNoire} onChange={(e) => setListeNoire(e.target.checked)} />
          Liste noire uniquement
        </label>
      </div>

      {chargement ? (
        <div className="clients__etat">Recherche…</div>
      ) : erreur ? (
        <div className="clients__etat clients__etat--erreur">
          <p>{erreur}</p>
          <button className="btn btn-contour" onClick={() => setEssai((n) => n + 1)}>Réessayer</button>
        </div>
      ) : !clients.length ? (
        <div className="clients__etat">
          {filtre ? (
            <p>Aucun client ne correspond à votre recherche.</p>
          ) : (
            <>
              <p>Aucun client pour le moment. Ils sont créés automatiquement lors des réservations en ligne, ou ici.</p>
              <button className="btn btn-rouge" onClick={() => setCreation(true)}>Ajouter un client</button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="clients__tableau" role="table" aria-label="Liste des clients">
            <div className="clients__ligne clients__ligne--titre" role="row">
              <span role="columnheader">Client</span>
              <span role="columnheader">Téléphone</span>
              <span role="columnheader">Réservations</span>
              <span role="columnheader">Total dépensé</span>
              <span role="columnheader">Dernier séjour</span>
            </div>
            {clients.map((c) => (
              <button key={c.id} type="button" role="row" className="clients__ligne" onClick={() => ouvrir(c.id)}>
                <span className="clients__nom" role="cell">
                  <strong>{c.full_name}</strong>
                  {c.liste_noire && <span className="clients__badge-noire">Liste noire</span>}
                  <small>{c.nationalite ?? ''}</small>
                </span>
                <span role="cell" className="clients__tel">{formatTelephone(c.phone)}</span>
                <span role="cell" data-libelle="Réservations">{c.nb_reservations}</span>
                <span role="cell" data-libelle="Total dépensé" className="clients__montant">{formatFCFA(c.total_depense)}</span>
                <span role="cell" data-libelle="Dernier séjour">{c.dernier_sejour ? formatDate(c.dernier_sejour) : '—'}</span>
              </button>
            ))}
          </div>

          {clients.length < total && (
            <div className="clients__plus">
              <button className="btn btn-contour" onClick={afficherPlus} disabled={chargementPlus}>
                {chargementPlus ? 'Chargement…' : `Afficher plus (${Math.min(TAILLE_PAGE, total - clients.length)} sur ${total - clients.length} restants)`}
              </button>
            </div>
          )}
        </>
      )}

      {creation && (
        <ClientModal
          onFermer={() => setCreation(false)}
          onEnregistre={(client) => ouvrir(client.id)}
        />
      )}
    </div>
  );
}
