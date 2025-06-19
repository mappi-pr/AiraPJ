import { useNavigate } from 'react-router-dom';
import React, { useState, useRef } from 'react';
import gearpath from '../assets/gear.png';
import sepath from '../assets/sound/se/main.mp3';

const Title: React.FC = () => {
  const [overlay, setOverlay] = useState(false);    
  const navigate = useNavigate();
  const seRef = useRef<HTMLAudioElement>(null);
  const seOn = useState(localStorage.getItem('seOn') === '1');

  // スタートボタン押下時
  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    setOverlay(true);
    if (seOn && seRef.current) {
      seRef.current.currentTime = 0;
      seRef.current.play();
      seRef.current.onended = () => {
        setOverlay(false);
        navigate('/character');
      };
    } else {
      setTimeout(() => {
        setOverlay(false);
        navigate('/character');
      }, 300);
    }
  };

  return (
    <div className="main-container" style={{ position: 'relative' }}>
      <audio ref={seRef} src={sepath} />
      <header>
        <a href="/settings" id="settings-icon" title="設定" style={{ position: 'absolute', left: 16, top: 16, zIndex: 2 }}>
          <img src={gearpath} alt="設定" style={{ width: 32, height: 32 }} />
        </a>
      </header>
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <h1 style={{ textAlign: 'center' }}>Aira PJ</h1>
        <form onSubmit={handleStart} style={{ margin: '16px 0' }}>
          <button type="submit" id="start-btn" disabled={overlay}>ゲームをはじめる</button>
        </form>
        <div style={{ marginBottom: 16 }}>
          <a href="/history" id="favorites-menu">おきにいり</a>
        </div>
      </main>
      <footer>
        <a href="/terms" id="terms-link" style={{ fontSize: 'small', position: 'absolute', left: 16, bottom: 16 }}>規約・クレジット</a>
      </footer>
      {overlay && (
        <div style={{ position: 'fixed', zIndex: 9999, top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', transition: 'opacity 0.5s' }} />
      )}
    </div>
  );
};

export default Title;
