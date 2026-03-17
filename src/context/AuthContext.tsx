import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AppUserRole = 'coach' | 'athlete';

interface AppUser {
  id: string;
  email: string;
  name: string | null;
  role: AppUserRole | null;
  avatar: string | null;
  status: string | null;
  coach_id: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  appUser: AppUser | null;
  role: AppUserRole | null;
  loading: boolean;
  signInWithEmail: (params: {
    email: string;
    password: string;
  }) => Promise<{ error: string | null }>;
  signUpWithEmail: (params: {
    email: string;
    password: string;
    name: string;
    role: 'coach' | 'athlete';
    gender?: 'homme' | 'femme';
    height_cm?: number | null;
    weight_kg?: number | null;
    age?: number | null;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** À appeler avant d'envoyer un message : garantit que l'utilisateur courant a une ligne dans public.users. Retourne true si OK, false si le profil est absent (migration à exécuter). */
  ensureCurrentUserInDb: () => Promise<boolean>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  needsPasswordReset: boolean;
  setNewPasswordAfterRecovery: (newPassword: string) => Promise<{ error: string | null }>;
  clearPasswordReset: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  const buildAppUserFromAuth = (authUser: User): AppUser => ({
    id: authUser.id,
    email: authUser.email ?? '',
    name: (authUser.user_metadata?.name as string | null) ?? null,
    role:
      (authUser.user_metadata?.role as AppUserRole | undefined) ??
      null,
    avatar: (authUser.user_metadata?.avatar as string | null) ?? null,
    status: null,
    coach_id: null,
  });

  const loadProfile = async (authUser: User | null) => {
    if (!authUser) {
      setAppUser(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, avatar, status, coach_id')
        .eq('id', authUser.id)
        .single();

      if (error || !data) {
        const fallback = buildAppUserFromAuth(authUser);
        try {
          await supabase.from('users').upsert(
            {
              id: authUser.id,
              name: fallback.name ?? fallback.email.split('@')[0],
              email: authUser.email ?? '',
              role: fallback.role ?? 'athlete',
            },
            { onConflict: 'id' }
          );
        } catch {
          // Ignore si RLS ou autre empêche l'upsert (ex. migration non exécutée)
        }
        setAppUser(fallback);
      } else {
        setAppUser({
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role as AppUserRole,
          avatar: data.avatar ?? null,
          status: data.status ?? null,
          coach_id: data.coach_id ?? null,
        });
      }
    } catch {
      setAppUser(buildAppUserFromAuth(authUser));
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session', error);
        } else {
          setSession(data.session);
          const authUser = data.session?.user ?? null;
          setUser(authUser);
          await loadProfile(authUser);
        }
      } finally {
        setLoading(false);
      }
    };

    init();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsPasswordReset(true);
      }
      setSession(newSession);
      const authUser = newSession?.user ?? null;
      setUser(authUser);
      loadProfile(authUser);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail: AuthContextValue['signInWithEmail'] = async ({
    email,
    password,
  }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase sign-in error', error);
      return { error: error.message };
    }

    const authUser = data.user ?? data.session?.user ?? null;
    setSession(data.session);
    setUser(authUser);
    await loadProfile(authUser);
    return { error: null };
  };

  const signUpWithEmail: AuthContextValue['signUpWithEmail'] = async ({
    email,
    password,
    name,
    role,
    gender,
    height_cm,
    weight_kg,
    age,
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          ...(gender && { gender }),
        },
      },
    });

    if (error) {
      console.error('Supabase sign-up error', error);
      return { error: error.message };
    }

    const authUser = data.user ?? data.session?.user ?? null;

    if (authUser) {
      await supabase.from('users').upsert({
        id: authUser.id,
        name,
        email,
        role,
        ...(gender && { gender }),
        ...(height_cm != null && { height_cm }),
        ...(weight_kg != null && { weight_kg }),
        ...(age != null && { age }),
      });
    }

    setSession(data.session ?? null);
    setUser(authUser);
    await loadProfile(authUser);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setAppUser(null);
  };

  const refreshProfile = async () => {
    await loadProfile(user);
  };

  const ensureCurrentUserInDb = async (): Promise<boolean> => {
    const authUser = user ?? (await supabase.auth.getUser()).data.user ?? null;
    if (!authUser) return false;
    const fallback = buildAppUserFromAuth(authUser);
    try {
      const { error } = await supabase.from('users').upsert(
        {
          id: authUser.id,
          name: fallback.name ?? fallback.email.split('@')[0],
          email: authUser.email ?? '',
          role: fallback.role ?? 'athlete',
        },
        { onConflict: 'id' }
      );
      if (error) return false;
    } catch {
      return false;
    }
    const { data } = await supabase.from('users').select('id').eq('id', authUser.id).single();
    return !!data;
  };

  const updatePassword = async (currentPassword: string, newPassword: string): Promise<{ error: string | null }> => {
    const email = user?.email;
    if (!email) return { error: 'Session invalide.' };
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (signInError) return { error: 'Mot de passe actuel incorrect.' };
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) return { error: updateError.message };
    return { error: null };
  };

  const resetPasswordForEmail = async (email: string): Promise<{ error: string | null }> => {
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}` : '';
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) return { error: error.message };
    return { error: null };
  };

  const setNewPasswordAfterRecovery = async (newPassword: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    setNeedsPasswordReset(false);
    return { error: null };
  };

  const clearPasswordReset = () => setNeedsPasswordReset(false);

  const value: AuthContextValue = {
    session,
    user,
    appUser,
    role:
      appUser?.role ??
      ((user?.user_metadata?.role as AppUserRole | undefined) ??
        null),
    loading,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshProfile,
    ensureCurrentUserInDb,
    updatePassword,
    resetPasswordForEmail,
    needsPasswordReset,
    setNewPasswordAfterRecovery,
    clearPasswordReset,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

