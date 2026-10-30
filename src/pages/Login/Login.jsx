import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './Login.css';

// Traduction des erreurs Supabase les plus fréquentes
const traduireErreur = (msg = '') => {
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (msg.includes('Email not confirmed')) return 'Veuillez confirmer votre email avant de vous connecter.';
  if (msg.includes('Failed to fetch')) return 'Connexion impossible. Vérifiez votre internet.';
  if (msg.includes('should be different')) return 'Le nouveau mot de passe doit être différent de l’ancien.';
  if (msg.includes('expired') || msg.includes('invalid')) return 'Le lien a expiré : redemandez « Mot de passe oublié ».';
  return msg || 'Une erreur est survenue.';
};

export default function Login() {
  const { signIn, signOut, resetPassword, recuperation, definirMotDePasse } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voirMdp, setVoirMdp] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [info, setInfo] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');

  useEffect(() => { document.title = 'Connexion · Zaquia Admin'; }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur(''); setInfo('');
    setChargement(true);
    try {
      const p = await signIn(email.trim(), password);
      navigate(p.role === 'menage' ? '/admin/menage' : '/admin/dashboard', { replace: true });
    } catch (err) {
      setErreur(traduireErreur(err.message));
    } finally {
      setChargement(false);
    }
  };

  // Lien « Mot de passe oublié » : choix du nouveau mot de passe
  const handleNouveauMotDePasse = async (e) => {
    e.preventDefault();
    setErreur('');
    if (nouveau.length < 8) return setErreur('Au moins 8 caractères.');
    if (nouveau !== confirmation) return setErreur('Les deux mots de passe ne correspondent pas.');
    setChargement(true);
    try {
      const p = await definirMotDePasse(nouveau);
      if (!p?.actif) {
        await signOut();
        setErreur('Mot de passe changé, mais votre compte n’est pas activé par l’administrateur.');
        return;
      }
      navigate(p.role === 'menage' ? '/admin/menage' : '/admin/dashboard', { replace: true });
    } catch (err) {
      setErreur(traduireErreur(err.message));
    } finally {
      setChargement(false);
    }
  };

  const handleMotDePasseOublie = async () => {
    setErreur(''); setInfo('');
    if (!email) return setErreur('Saisissez d’abord votre email.');
    const { error } = await resetPassword(email.trim());
    if (error) setErreur(traduireErreur(error.message));
    else setInfo('Un lien de réinitialisation vous a été envoyé par email.');
  };

  return (
    <div className="login">
      {/* Panneau gauche : identité visuelle */}
      <aside className="login__visuel">
        <div className="login__visuel-contenu">
          <h2>Gérez votre résidence<br />en toute sérénité.</h2>
          <p>Réservations, planning, caisse, ménage et rapports — au même endroit.</p>
        </div>
        <div className="login__bandes"><span /><span /><span /></div>
      </aside>

      {/* Panneau droit : formulaire */}
      <main className="login__panneau">
        {recuperation ? (
          <form className="login__form" onSubmit={handleNouveauMotDePasse} noValidate>
            <img src="/logo-zaquia.png" alt="Zaquia Résidence" className="login__logo" />
            <h1>Nouveau mot de passe</h1>
            <p className="login__sous-titre">Choisissez votre nouveau mot de passe</p>

            {erreur && <div className="login__alerte login__alerte--erreur">{erreur}</div>}

            <div className="champ">
              <label htmlFor="nouveau">Nouveau mot de passe</label>
              <input id="nouveau" type={voirMdp ? 'text' : 'password'} autoComplete="new-password" placeholder="8 caractères minimum"
                value={nouveau} onChange={(e) => setNouveau(e.target.value)} />
            </div>
            <div className="champ">
              <label htmlFor="confirmation">Confirmer le mot de passe</label>
              <input id="confirmation" type={voirMdp ? 'text' : 'password'} autoComplete="new-password"
                value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
            </div>
            <button type="button" className="login__oublie" onClick={() => setVoirMdp(!voirMdp)}>
              {voirMdp ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
            </button>
            <button type="submit" className="btn btn-rouge login__submit" disabled={chargement || !nouveau || !confirmation}>
              {chargement ? 'Enregistrement…' : 'Enregistrer et me connecter'}
            </button>
          </form>
        ) : (
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <img src="/logo-zaquia.png" alt="Zaquia Résidence" className="login__logo" />
          <h1>Connexion</h1>
          <p className="login__sous-titre">Espace d’administration</p>

          {erreur && <div className="login__alerte login__alerte--erreur">{erreur}</div>}
          {info && <div className="login__alerte login__alerte--info">{info}</div>}

          <div className="champ">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" placeholder="vous@zaquia.sn"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="champ">
            <label htmlFor="password">Mot de passe</label>
            <div className="login__mdp">
              <input id="password" type={voirMdp ? 'text' : 'password'} autoComplete="current-password"
                placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="login__oeil" onClick={() => setVoirMdp(!voirMdp)}>
                {voirMdp ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          <button type="button" className="login__oublie" onClick={handleMotDePasseOublie}>
            Mot de passe oublié ?
          </button>

          <button type="submit" className="btn btn-rouge login__submit" disabled={chargement || !email || !password}>
            {chargement ? 'Connexion…' : 'Se connecter'}
          </button>

          <p className="login__pied">© {new Date().getFullYear()} Zaquia Résidence</p>
        </form>
        )}
      </main>
    </div>
  );
}
