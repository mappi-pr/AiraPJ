import { useNavigate, Link } from 'react-router-dom';
import React from 'react';
import gearpath from '../assets/gear.png';
import texts from '../locales/ja.json';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

const Title: React.FC = () => {
  const navigate = useNavigate();
  const { playClick, playSuccess } = useSound();

  // スタートボタン押下時
  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccess();
    navigate('/character');
  };

  return (
    <PageTransition>
      <SparkleEffect />
      <div className="main-container" style={{ position: 'relative' }}>
        <header>
          <Link to="/settings" id="settings-icon" title={texts.title.settings} style={{ position: 'absolute', left: 16, top: 16, zIndex: 2 }} onClick={playClick}>
            <img src={gearpath} alt={texts.title.settings} style={{ width: 32, height: 32 }} />
          </Link>
        </header>
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <h1 style={{ textAlign: 'center' }}>{texts.title.mainTitle}</h1>
          <form onSubmit={handleStart} style={{ margin: '16px 0' }}>
            <button type="submit" id="start-btn">{texts.title.startBtn}</button>
          </form>
          <div style={{ marginBottom: 16 }}>
            <Link to="/history" id="favorites-menu" onClick={playClick}>{texts.title.favorites}</Link>
          </div>
        </main>
        <footer style={{ position: 'absolute', bottom: 16, width: '100%', textAlign: 'center' }}>
          <Link to="/terms" id="terms-link" style={{ fontSize: 'small' }} onClick={playClick}>{texts.title.terms}</Link>
        </footer>
      </div>
    </PageTransition>
  );
};

export default Title;
