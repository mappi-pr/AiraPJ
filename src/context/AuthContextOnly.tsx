import { createContext, useContext } from 'react';

export type UserRole = 'system_admin' | 'game_master' | 'user';

export interface User {
  email: string;
  name?: string;
  picture?: string;
  role: UserRole;
  isSystemAdmin: boolean;
  isGameMaster: boolean;
  isAdmin: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credential: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isSystemAdmin: boolean;
  isGameMaster: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
