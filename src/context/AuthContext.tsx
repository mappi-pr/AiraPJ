import React, { useState, useEffect } from 'react';
import { AuthContext } from './AuthContextOnly';
import type { User } from './AuthContextOnly';

export type { UserRole, User, AuthContextType } from './AuthContextOnly';

// ローカルストレージから認証情報を同期的に読み出す。
// useState の初期化で使うことで、初回レンダー時点で復元が完了し、
// ProtectedRoute が復元前に判定してしまうレースを防ぐ
function loadSavedSession(): { user: User | null; token: string | null } {
  try {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('authUser');

    if (savedToken && savedUser) {
      return { user: JSON.parse(savedUser) as User, token: savedToken };
    }
  } catch (error) {
    console.error('Failed to restore saved session:', error);
  }
  return { user: null, token: null };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => loadSavedSession().user);
  const [token, setToken] = useState<string | null>(() => loadSavedSession().token);

  useEffect(() => {
    // 認証エラーイベントをリッスン
    const handleAuthLogout = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  const login = async (credential: string) => {
    try {
      // Google IDトークンをバックエンドで検証（fetchを使用してインターセプターを回避）
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: credential }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const userData = await response.json();

      setUser(userData);
      setToken(credential);

      // ローカルストレージに保存
      localStorage.setItem('authToken', credential);
      localStorage.setItem('authUser', JSON.stringify(userData));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAdmin: user?.isAdmin || false,
        isSystemAdmin: user?.isSystemAdmin || false,
        isGameMaster: user?.isGameMaster || false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
