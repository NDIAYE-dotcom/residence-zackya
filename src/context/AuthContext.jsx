import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { effacerTousLesBrouillons } from '../lib/brouillons.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charge le profil (rôle, nom, actif) de l'utilisateur connecté
  const chargerProfil = async (user) => {
    if (!user) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await chargerProfil(data.session?.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      // setTimeout évite un blocage connu de supabase-js dans ce callback
      setTimeout(() => chargerProfil(newSession?.user), 0);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
    if (!p?.actif) {
      await supabase.auth.signOut();
      throw new Error('Votre compte n’est pas encore activé par l’administrateur.');
    }
    setProfile(p);
    return p;
  };

  const signOut = () => {
    effacerTousLesBrouillons(); // pas de données clients laissées pour le collègue suivant
    return supabase.auth.signOut();
  };

  // Après modification de son propre profil (nom, téléphone…)
  const rechargerProfil = () => chargerProfil(session?.user);

  const resetPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/login` });

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, resetPassword, rechargerProfil }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
