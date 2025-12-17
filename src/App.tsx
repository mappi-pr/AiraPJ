import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
import bgmpath from './assets/sound/bgm/main.mp3';
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

function App() {
  const bgmRef = useRef<HTMLAudioElement>(null);
  const [bgmOn, setBgmOn] = useState(localStorage.getItem('bgmOn') !== '0');
  const [seOn, setSeOn] = useState(localStorage.getItem('seOn') === '1');

  // BGM自動再生
  React.useEffect(() => {
    if (bgmOn && bgmRef.current) {
      bgmRef.current.play();
    } else if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current.currentTime = 0;
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
    <PartsProvider>
      <BrowserRouter>
        <audio ref={bgmRef} src={bgmpath} loop />
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
  )
}

export default App
