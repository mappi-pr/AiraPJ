import { useNavigate, Link } from 'react-router-dom';
import React from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useTranslation } from '../hooks/useTranslation';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';
import { useAuth } from '../context/AuthContext';

const Title: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, logout, isSystemAdmin, isGameMaster } = useAuth();
  const { playClick, playSuccess } = useSound();
  const { t } = useTranslation();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  // スタートボタン押下時
  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccess();
    navigate('/character');
  };

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
    <PageTransition>
      <SparkleEffect />
      <div className="main-container" style={{ position: 'relative', minHeight: '50vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        {/* ログイン情報: 上部左（アイコンのみ、クリックで展開） - 固定位置 */}
        <div style={{ position: 'fixed', top: 8, left: 8, zIndex: 1000 }}>
          {user ? (
            <div style={{ position: 'relative' }}>
              {/* プロフィールアイコン（クリックで展開） */}
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {user.picture && user.picture.trim() ? (
                  <img src={user.picture} alt="Profile" style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #fff' }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                    {(user.name || 'U')[0].toUpperCase()}
                  </div>
                )}
              </button>
              
              {/* 展開メニュー */}
              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: 48,
                  left: 0,
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                  padding: 12,
                  minWidth: 150,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  fontSize: '0.9em'
                }}>
                  <div style={{ marginBottom: 8, fontWeight: 'bold' }}>{user.name || 'ユーザー'}</div>
                  {isSystemAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#FF6B6B', fontSize: '0.85em' }}>🔑 システム管理者</span>
                      <Link to="/settings" id="settings-icon" title={t.title.settings} onClick={() => { playClick(); setShowUserMenu(false); }} style={{ fontSize: '16px', textDecoration: 'none' }}>
                        ⚙️
                      </Link>
                    </div>
                  )}
                  {isGameMaster && !isSystemAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#4CAF50', fontSize: '0.85em' }}>⚔️ ゲームマスター</span>
                      <Link to="/settings" id="settings-icon" title={t.title.settings} onClick={() => { playClick(); setShowUserMenu(false); }} style={{ fontSize: '16px', textDecoration: 'none' }}>
                        ⚙️
                      </Link>
                    </div>
                  )}
                  <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); logout(); setShowUserMenu(false); }} 
                    style={{ 
                      display: 'block',
                      fontSize: '0.85em', 
                      marginTop: 8,
                      color: '#0066cc',
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
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

        {/* BGM/SE: 上部右既存サイズ（既存のオーディオコントロールがここに表示される想定） */}

        {/* ゲーム開始ボタン: 中央上部 */}
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', flex: 1, padding: '0 20px', marginTop: '60px' }}>
          <h1 style={{ textAlign: 'center', marginBottom: 24, marginTop: 0 }}>{t.title.mainTitle}</h1>
          <form onSubmit={handleStart} style={{ margin: 0 }}>
            <button type="submit" id="start-btn">{t.title.startBtn}</button>
          </form>
        </main>

        {/* おきにいり: 左下 */}
        <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
          <Link to="/history" id="favorites-menu" onClick={playClick}>{t.title.favorites}</Link>
        </div>

        {/* 規約・クレジット: 右下 */}
        <footer style={{ position: 'absolute', bottom: 8, right: 8 }}>
          <Link to="/terms" id="terms-link" style={{ fontSize: 'small' }} onClick={playClick}>{t.title.terms}</Link>
        </footer>
      </div>
    </PageTransition>
  );
};

export default Title;
