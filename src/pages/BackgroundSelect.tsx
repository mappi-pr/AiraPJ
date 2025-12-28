import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { PartsContext } from '../context/PartsContextOnly';
import type { PartInfo } from '../context/PartsContextOnly';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';
import { NavigationButton } from '../components/NavigationButton';

const BackgroundSelect: React.FC = () => {
  const [backgrounds, setBackgrounds] = useState<PartInfo[]>([]);
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const partsContext = useContext(PartsContext);
  const { playClick, playSuccess } = useSound();
  const { t } = useTranslation();

  useEffect(() => {
    fetch('/api/background')
      .then(res => res.json())
      .then(data => setBackgrounds(data));
  }, []);

  // 背景選択時にContextへ保存
  useEffect(() => {
    if (!partsContext) return;
    partsContext.setSelectedParts(prev => ({
      ...prev,
      background: backgrounds[idx] || null
    }));
    // eslint-disable-next-line
  }, [idx, backgrounds]);

  const handlePrev = () => {
    playClick();
    setIdx((idx - 1 + backgrounds.length) % backgrounds.length);
  };
  const handleNext = () => {
    playClick();
    setIdx((idx + 1) % backgrounds.length);
  };
  const handleNextPage = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccess();
    navigate('/costume');
  };

  return (
    <PageTransition>
      <SparkleEffect />
      <div className="main-container">
        <h1>{t.backgroundSelect.title}</h1>
        <div className="select-container">
          {backgrounds.length > 0 ? (
            <>
              <NavigationButton direction="prev" onClick={handlePrev} />
              <div id="background-info">
                <img 
                  src={backgrounds[idx].assetPath} 
                  alt={t.backgroundSelect.imageAlt} 
                  style={{ 
                    maxWidth: '100%',
                    maxHeight: '200px',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain'
                  }} 
                />
                <div>{backgrounds[idx].name}</div>
              </div>
              <NavigationButton direction="next" onClick={handleNext} />
            </>
          ) : (
            <div>{t.common.noData}</div>
          )}
        </div>
        <form onSubmit={handleNextPage}>
          <button type="submit">{t.common.next}</button>
        </form>
        <nav>
          <Link to="/character" onClick={playClick}>{t.backgroundSelect.backToCharacter}</Link> |
          <Link to="/title" onClick={playClick}>{t.common.backToTitle}</Link>
        </nav>
      </div>
    </PageTransition>
  );
};

export default BackgroundSelect;
