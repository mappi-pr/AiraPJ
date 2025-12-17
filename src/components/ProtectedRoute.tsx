import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, isAdmin } = useAuth();

  // 管理者権限が必要な場合
  if (requireAdmin) {
    if (!user) {
      // 未ログインの場合はタイトル画面へ
      return <Navigate to="/title" replace />;
    }
    if (!isAdmin) {
      // ログイン済みだが管理者でない場合もタイトル画面へ
      return <Navigate to="/title" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
