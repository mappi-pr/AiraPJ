import { useNavigate, Link } from 'react-router-dom';
import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

const Title: React.FC = () => {
  const navigate = useNavigate();
  const { playClick, playSuccess } = useSound();
  const { t } = useTranslation();

  // スタートボタン押下時
  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccess();
    navigate('/character');
  };

  return (
    <PageTransition>
      <SparkleEffect />
      <div className="main-container" style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: '80px' }}>
        {/* ゲーム開始ボタン: 中央上部 */}
        <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', flex: 1, padding: '0 20px' }}>
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
