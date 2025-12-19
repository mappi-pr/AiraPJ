import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
import bgmpath from './assets/sound/bgm/main.mp3'; // Placeholder - create actual file if needed
import React, { useState, useRef } from 'react';
import Title from './pages/Title';
import CharacterPartsSelect from './pages/CharacterPartsSelect';
import BackgroundSelect from './pages/BackgroundSelect';
import CostumeSelect from './pages/CostumeSelect';
import Photo from './pages/Photo';
import History from './pages/History';
import Settings from './pages/Settings';
import Terms from './pages/Terms';
import { PartsProvider } from './context/PartsContext';
import { LocaleProvider } from './context/LocaleContext';

function App() {
  const bgmRef = useRef<HTMLAudioElement>(null);
  const interactionHandlersRef = useRef<{
    click?: () => void;
    keydown?: () => void;
  }>({});
  
  // BGM: Default to ON on first visit (auto-play background music)
  const [bgmOn, setBgmOn] = useState(localStorage.getItem('bgmOn') !== '0');
  // SE: Default to OFF on first visit (opt-in for sound effects)
  const [seOn, setSeOn] = useState(localStorage.getItem('seOn') === '1');

  // BGM自動再生
  React.useEffect(() => {
    // クリーンアップ：前回のイベントリスナーを削除
    const cleanup = () => {
      if (interactionHandlersRef.current.click) {
        document.removeEventListener('click', interactionHandlersRef.current.click);
        interactionHandlersRef.current.click = undefined;
      }
      if (interactionHandlersRef.current.keydown) {
        document.removeEventListener('keydown', interactionHandlersRef.current.keydown);
        interactionHandlersRef.current.keydown = undefined;
      }
    };
    
    if (bgmOn && bgmRef.current) {
      const playBgm = async () => {
        if (bgmRef.current) {
          try {
            await bgmRef.current.play();
            return true;
          } catch (err) {
            console.log('BGM auto-play prevented by browser:', err);
            return false;
          }
        }
        return false;
      };
      
      // 即座に再生を試みる
      playBgm().then(success => {
        if (!success) {
          // ブラウザのautoplay制限対策：最初のユーザーインタラクションで再生
          const handleFirstInteraction = async () => {
            const played = await playBgm();
            if (played) {
              cleanup();
            }
          };
          
          interactionHandlersRef.current.click = handleFirstInteraction;
          interactionHandlersRef.current.keydown = handleFirstInteraction;
          
          document.addEventListener('click', handleFirstInteraction);
          document.addEventListener('keydown', handleFirstInteraction);
        }
      });
      
      return cleanup;
    } else if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current.currentTime = 0;
      cleanup();
    }
  }, [bgmOn]);

  // ON/OFF切替
  const toggleBgm = () => {
    const next = !bgmOn;
    setBgmOn(next);
    localStorage.setItem('bgmOn', next ? '1' : '0');
  };
  const toggleSe = () => {
    const next = !seOn;
    setSeOn(next);
    localStorage.setItem('seOn', next ? '1' : '0');
  };

  return (
    <LocaleProvider>
      <PartsProvider>
        <BrowserRouter>
          { <audio ref={bgmRef} src={bgmpath} loop /> }
          <div id="sound-toggle" style={{ position: 'absolute', right: 16, top: 16, zIndex: 2, display: 'flex', gap: 8 }}>
            <button type="button" onClick={toggleBgm}>BGM: {bgmOn ? 'ON' : 'OFF'}</button>
            <button type="button" onClick={toggleSe}>SE: {seOn ? 'ON' : 'OFF'}</button>
          </div>
          <Routes>
            <Route path="/" element={<Title />} />
            <Route path="/title" element={<Title />} />
            <Route path="/character" element={<CharacterPartsSelect />} />
            <Route path="/background" element={<BackgroundSelect />} />
            <Route path="/costume" element={<CostumeSelect />} />
            <Route path="/photo" element={<Photo />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </BrowserRouter>
      </PartsProvider>
    </LocaleProvider>
  )
}

export default App
