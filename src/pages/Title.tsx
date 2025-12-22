import { useNavigate, Link } from 'react-router-dom';
import React, { useState, useRef } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import gearpath from '../assets/gear.png';
import sepath from '../assets/sound/se/main.mp3';
import texts from '../locales/ja.json';
import { useAuth } from '../context/AuthContext';
import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

const Title: React.FC = () => {
  const navigate = useNavigate();
  const seRef = useRef<HTMLAudioElement>(null);
  const [seOn] = useState(localStorage.getItem('seOn') === '1');
  const { user, login, logout, isAdmin } = useAuth();
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
    <div className="main-container" style={{ position: 'relative' }}>
      <audio ref={seRef} src={sepath} />
      <header>
        {/* 管理画面アイコンは管理者のみ表示 */}
        {isAdmin && (
          <Link to="/settings" id="settings-icon" title={texts.title.settings} style={{ position: 'absolute', left: 16, top: 16, zIndex: 2 }}>
            <img src={gearpath} alt={texts.title.settings} style={{ width: 32, height: 32 }} />
          </Link>
        )}
      </header>
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <h1 style={{ textAlign: 'center' }}>{texts.title.mainTitle}</h1>
        
        {/* ログイン状態表示 */}
        <div style={{ margin: '16px 0', textAlign: 'center' }}>
          {user ? (
            <div>
              <p>ようこそ、{user.name || 'ユーザー'}さん</p>
              {user.picture && <img src={user.picture} alt="Profile" style={{ width: 48, height: 48, borderRadius: '50%' }} />}
              {isAdmin && <p style={{ color: '#4CAF50', fontWeight: 'bold' }}>管理者権限</p>}
              <button onClick={logout} style={{ marginTop: 8 }}>ログアウト</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <p>Googleアカウントでログイン:</p>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
              />
            </div>
          )}
        </div>

        <form onSubmit={handleStart} style={{ margin: '16px 0' }}>
          <button type="submit" id="start-btn" disabled={overlay}>{texts.title.startBtn}</button>
        </form>
        <div style={{ marginBottom: 16 }}>
          <Link to="/history" id="favorites-menu">{texts.title.favorites}</Link>
        </div>
      </main>
      <footer>
        <Link to="/terms" id="terms-link" style={{ fontSize: 'small', position: 'absolute', left: 16, bottom: 16 }}>{texts.title.terms}</Link>
      </footer>
      {overlay && (
        <div style={{ position: 'fixed', zIndex: 9999, top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', transition: 'opacity 0.5s' }} />
      )}
    </div>
    <PageTransition>
      <SparkleEffect />
      <div className="main-container" style={{ position: 'relative' }}>
        <header>
          <Link to="/settings" id="settings-icon" title={t.title.settings} style={{ position: 'absolute', left: 16, top: 16, zIndex: 2 }} onClick={playClick}>
            <img src={gearpath} alt={t.title.settings} style={{ width: 32, height: 32 }} />
          </Link>
        </header>
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <h1 style={{ textAlign: 'center' }}>{t.title.mainTitle}</h1>
          <form onSubmit={handleStart} style={{ margin: '16px 0' }}>
            <button type="submit" id="start-btn">{t.title.startBtn}</button>
          </form>
          <div style={{ marginBottom: 16 }}>
            <Link to="/history" id="favorites-menu" onClick={playClick}>{t.title.favorites}</Link>
          </div>
        </main>
        <footer style={{ position: 'absolute', bottom: 16, width: '100%', textAlign: 'center' }}>
          <Link to="/terms" id="terms-link" style={{ fontSize: 'small' }} onClick={playClick}>{t.title.terms}</Link>
        </footer>
      </div>
    </PageTransition>
  );
};

export default Title;
