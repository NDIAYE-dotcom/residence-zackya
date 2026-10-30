import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './Login.css';

// Traduction des erreurs Supabase les plus fréquentes
const traduireErreur = (msg = '') => {
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (msg.includes('Email not confirmed')) return 'Veuillez confirmer votre email avant de vous connecter.';
  if (msg.includes('Failed to fetch')) return 'Connexion impossible. Vérifiez votre internet.';
  return msg || 'Une erreur est survenue.';
};

export default function Login() {
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voirMdp, setVoirMdp] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [info, setInfo] = useState('');

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
      </main>
    </div>
  );
}
