import { useNavigate, Link } from 'react-router-dom';
import React from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import gearpath from '../assets/gear.png';
import { useTranslation } from '../hooks/useTranslation';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';
import { useAuth } from '../context/AuthContext';

const Title: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, logout, isAdmin, isSystemAdmin, isGameMaster } = useAuth();
  const { playClick, playSuccess } = useSound();
  const { t } = useTranslation();

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
      <div className="main-container" style={{ position: 'relative', minHeight: '100vh' }}>
        {/* ログイン情報: 上部左小さ目 */}
        <div style={{ position: 'absolute', top: 16, left: 16, fontSize: '0.85em' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {user.picture && user.picture.trim() && <img src={user.picture} alt="Profile" style={{ width: 32, height: 32, borderRadius: '50%' }} />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: '0.9em' }}>{user.name || 'ユーザー'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isSystemAdmin && <span style={{ color: '#FF6B6B', fontWeight: 'bold', fontSize: '0.85em' }}>🔑 システム管理者</span>}
                  {isGameMaster && !isSystemAdmin && <span style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '0.85em' }}>⚔️ ゲームマスター</span>}
                  {/* 設定アイコン: ログイン情報の横 */}
                  {isAdmin && (
                    <Link to="/settings" id="settings-icon" title={t.title.settings} onClick={playClick}>
                      <img src={gearpath} alt={t.title.settings} style={{ width: 20, height: 20 }} />
                    </Link>
                  )}
                </div>
                <button onClick={logout} style={{ fontSize: '0.8em', padding: '2px 8px' }}>ログアウト</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
              />
            </div>
          )}
        </div>

        {/* BGM/SE: 上部右既存サイズ（既存のオーディオコントロールがここに表示される想定） */}

        {/* ゲーム開始ボタン: 中央 */}
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', paddingTop: '80px', paddingBottom: '80px' }}>
          <h1 style={{ textAlign: 'center', marginBottom: 32 }}>{t.title.mainTitle}</h1>
          <form onSubmit={handleStart} style={{ margin: '16px 0' }}>
            <button type="submit" id="start-btn">{t.title.startBtn}</button>
          </form>
        </main>

        {/* おきにいり: 左下 */}
        <div style={{ position: 'absolute', bottom: 16, left: 16 }}>
          <Link to="/history" id="favorites-menu" onClick={playClick}>{t.title.favorites}</Link>
        </div>

        {/* 規約・クレジット: 右下 */}
        <footer style={{ position: 'absolute', bottom: 16, right: 16 }}>
          <Link to="/terms" id="terms-link" style={{ fontSize: 'small' }} onClick={playClick}>{t.title.terms}</Link>
        </footer>
      </div>
    </PageTransition>
  );
};

export default Title;
