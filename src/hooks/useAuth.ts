import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { AuthService } from '../services/auth.service';
import type { UserProfile } from '../types/models';

type AuthContextType = {
  user: UserProfile | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  pendingConfirmation: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearPendingConfirmation: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAuthenticated: false,
  loading: true,
  pendingConfirmation: false,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
  clearPendingConfirmation: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  useEffect(() => {
    // Restore session on mount
    AuthService.getSession()
      .then((profile) => setUser(profile))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
      } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        const profile = await AuthService.fetchProfile(session.user.id);
        if (profile) setUser(profile);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const profile = await AuthService.signUp(email, password, fullName);
    if (profile) {
      setUser(profile);
    } else {
      // Email confirmation required — no session yet
      setPendingConfirmation(true);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const profile = await AuthService.signIn(email, password);
    setUser(profile);
  }, []);

  const signOut = useCallback(async () => {
    await AuthService.signOut();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const updated = await AuthService.updateProfile(updates);
    setUser(updated);
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await AuthService.getSession();
    setUser(profile);
  }, []);

  const clearPendingConfirmation = useCallback(() => {
    setPendingConfirmation(false);
  }, []);

  const value: AuthContextType = {
    user,
    profile: user,
    isAuthenticated: !!user,
    loading,
    pendingConfirmation,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    clearPendingConfirmation,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
