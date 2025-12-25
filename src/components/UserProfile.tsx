import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useSound } from '../utils/useSound';
import { useTranslation } from '../hooks/useTranslation';
import './UserProfile.css';

export const UserProfile: React.FC = () => {
  const { user, login, logout, isSystemAdmin, isGameMaster } = useAuth();
  const { playClick } = useSound();
  const { t } = useTranslation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Google ログイン成功時
  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (credentialResponse.credential) {
        await login(credentialResponse.credential);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('ログインに失敗しました');
    }
  };

  // Google ログイン失敗時
  const handleGoogleError = () => {
    console.error('Google Login Failed');
    alert('Googleログインに失敗しました');
  };

  return (
    <div className="user-profile">
      {user ? (
        <div className="user-profile-container">
          {/* プロフィールアイコン（クリックで展開） */}
          <button
            className="user-profile-icon"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="ユーザーメニュー"
          >
            {user.picture && user.picture.trim() ? (
              <img src={user.picture} alt="Profile" className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">
                {(user.name || 'U')[0].toUpperCase()}
              </div>
            )}
          </button>
          
          {/* 展開メニュー */}
          {showUserMenu && (
            <div className="user-profile-menu">
              <div className="user-profile-name">{user.name || 'ユーザー'}</div>
              {isSystemAdmin && (
                <div className="user-profile-role">
                  <span className="role-badge system-admin">🔑 システム管理者</span>
                  <Link 
                    to="/settings" 
                    className="settings-link" 
                    title={t.title.settings} 
                    onClick={() => { playClick(); setShowUserMenu(false); }}
                  >
                    ⚙️
                  </Link>
                </div>
              )}
              {isGameMaster && !isSystemAdmin && (
                <div className="user-profile-role">
                  <span className="role-badge game-master">⚔️ ゲームマスター</span>
                  <Link 
                    to="/settings" 
                    className="settings-link" 
                    title={t.title.settings} 
                    onClick={() => { playClick(); setShowUserMenu(false); }}
                  >
                    ⚙️
                  </Link>
                </div>
              )}
              <a 
                href="#" 
                className="logout-link"
                onClick={(e) => { e.preventDefault(); logout(); setShowUserMenu(false); }}
              >
                ログアウト
              </a>
            </div>
          )}
        </div>
      ) : (
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap
          type="icon"
          shape="circle"
          size="large"
        />
      )}
    </div>
  );
};
