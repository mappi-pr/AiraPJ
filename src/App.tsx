import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
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
import { AuthProvider } from './context/AuthContext';
import { setupAxiosInterceptors } from './utils/axiosConfig';
import ProtectedRoute from './components/ProtectedRoute';
import { LocaleProvider } from './context/LocaleContext';
import { NavigationButtonProvider } from './context/NavigationButtonContext';
import texts from './locales/ja.json';

// BGM file path - place your MP3 file in src/assets/sound/bgm/main.mp3
// Empty string disables BGM until file is added
const bgmpath = '';

function App() {
  const bgmRef = useRef<HTMLAudioElement>(null);
  const interactionHandlersRef = useRef<{
    click?: () => void;
    keydown?: () => void;
  }>({});
  
  // 初回訪問判定：localStorageにキーがない場合はモーダルを表示
  const bgmStorageValue = localStorage.getItem('bgmOn');
  const seStorageValue = localStorage.getItem('seOn');
  const [showAudioModal, setShowAudioModal] = useState(bgmStorageValue === null && seStorageValue === null);
  
  // BGM: 初回はモーダルで決定するためfalseで初期化、それ以外はlocalStorageから取得
  const [bgmOn, setBgmOn] = useState(
    bgmStorageValue === null ? false : bgmStorageValue !== '0'
  );
  // SE: 初回はモーダルで決定するためfalseで初期化、それ以外はlocalStorageから取得
  const [seOn, setSeOn] = useState(
    seStorageValue === null ? false : seStorageValue !== '0'
  );

  // Axiosインターセプターのセットアップ
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

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

  // モーダルでの音声設定（BGM/SE一括設定）
  const handleAudioChoice = (enableAudio: boolean) => {
    setBgmOn(enableAudio);
    setSeOn(enableAudio);
    localStorage.setItem('bgmOn', enableAudio ? '1' : '0');
    localStorage.setItem('seOn', enableAudio ? '1' : '0');
    setShowAudioModal(false);
  };

  return (
  <AuthProvider>
  <LocaleProvider>
    <NavigationButtonProvider>
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
            backgroundColor: 'rgba(15, 52, 96, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%)',
              padding: '2.5rem',
              borderRadius: '16px',
              maxWidth: '420px',
              textAlign: 'center',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset'
            }}>
              <h2 style={{ 
                marginTop: 0, 
                marginBottom: '1.5rem',
                color: '#ffffff',
                fontSize: '1.5rem',
                fontWeight: '600',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
              }}>{texts.audioModal.title}</h2>
              <p style={{ 
                marginBottom: '2rem', 
                lineHeight: '1.6',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.95rem'
              }}>
                {texts.audioModal.message}<br />
                {texts.audioModal.question}
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  type="button" 
                  onClick={() => handleAudioChoice(true)}
                  style={{
                    background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
                    color: 'white',
                    padding: '0.75rem 2rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(74, 144, 226, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 144, 226, 0.3)';
                  }}
                >
                  {texts.audioModal.enableButton}
                </button>
                <button 
                  type="button" 
                  onClick={() => handleAudioChoice(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    padding: '0.75rem 2rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {texts.audioModal.disableButton}
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
    </NavigationButtonProvider>
  </AuthProvider>
  </LocaleProvider>
  )
}

export default App
