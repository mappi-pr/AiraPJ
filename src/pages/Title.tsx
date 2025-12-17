import { useNavigate, Link } from 'react-router-dom';
import React, { useState } from 'react';
import gearpath from '../assets/gear.png';
import texts from '../locales/ja.json';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

const Title: React.FC = () => {
  const [overlay, setOverlay] = useState(false);    
  const navigate = useNavigate();
  const { playClick, playSuccess } = useSound();

  // スタートボタン押下時
  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccess();
    setOverlay(true);
    setTimeout(() => {
      setOverlay(false);
      navigate('/character');
    }, 300);
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
            <button type="submit" id="start-btn" disabled={overlay}>{texts.title.startBtn}</button>
          </form>
          <div style={{ marginBottom: 16 }}>
            <Link to="/history" id="favorites-menu" onClick={playClick}>{texts.title.favorites}</Link>
          </div>
        </main>
        <footer>
          <Link to="/terms" id="terms-link" style={{ fontSize: 'small', position: 'absolute', left: 16, bottom: 16 }} onClick={playClick}>{texts.title.terms}</Link>
        </footer>
        {overlay && (
          <div style={{ position: 'fixed', zIndex: 9999, top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', transition: 'opacity 0.5s', opacity: 1, backdropFilter: 'blur(5px)' }} />
        )}
      </div>
    </PageTransition>
  );
};

export default Title;
