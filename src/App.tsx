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
  const interactionHandlersRef = useRef<{
    click?: () => void;
    keydown?: () => void;
  }>({});
  
  // 初回訪問判定：localStorageにキーがない場合はモーダルを表示
  const bgmStorageValue = localStorage.getItem('bgmOn');
  const [showAudioModal, setShowAudioModal] = useState(bgmStorageValue === null);
  
  // BGM: 初回はモーダルで決定するためfalseで初期化、それ以外はlocalStorageから取得
  const [bgmOn, setBgmOn] = useState(
    bgmStorageValue === null ? false : bgmStorageValue !== '0'
  );
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
        if (bgmRef.current && !bgmRef.current.paused) {
          // 既に再生中なら何もしない
          return true;
        }
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
            // イベントリスナー実行時にオーディオがpausedでない場合はスキップ
            // （既に再生中か、ユーザーがBGMをOFFにした）
            if (bgmRef.current && bgmRef.current.paused) {
              const played = await playBgm();
              if (played) {
                cleanup();
              }
            }
          };
          
          interactionHandlersRef.current.click = handleFirstInteraction;
          interactionHandlersRef.current.keydown = handleFirstInteraction;
          
          document.addEventListener('click', handleFirstInteraction);
          document.addEventListener('keydown', handleFirstInteraction);
        }
      });
    } else if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current.currentTime = 0;
      cleanup();
    }
    
    // 常にクリーンアップ関数を返して、イベントリスナーを確実に削除
    return cleanup;
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

  // モーダルでの音声設定
  const handleAudioChoice = (enableAudio: boolean) => {
    setBgmOn(enableAudio);
    localStorage.setItem('bgmOn', enableAudio ? '1' : '0');
    setShowAudioModal(false);
  };

  return (
    <PartsProvider>
      <BrowserRouter>
        <audio ref={bgmRef} src={bgmpath} loop />
        
        {/* 音声設定モーダル */}
        {showAudioModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              backgroundColor: '#1a1a1a',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '400px',
              textAlign: 'center',
              border: '1px solid #646cff'
            }}>
              <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>音声設定</h2>
              <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
                このサイトでは、音声が流れるコンテンツが含まれます。<br />
                音声をONにしますか？
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  type="button" 
                  onClick={() => handleAudioChoice(true)}
                  style={{
                    backgroundColor: '#646cff',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  ONにする
                </button>
                <button 
                  type="button" 
                  onClick={() => handleAudioChoice(false)}
                  style={{
                    backgroundColor: '#2a2a2a',
                    color: 'rgba(255, 255, 255, 0.87)',
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem'
                  }}
                >
                  OFFにする
                </button>
              </div>
            </div>
          </div>
        )}
        
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
