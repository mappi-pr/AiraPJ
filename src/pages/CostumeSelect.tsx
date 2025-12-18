import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { PartsContext } from '../context/PartsContextOnly';
import type { PartInfo } from '../context/PartsContextOnly';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

const CostumeSelect: React.FC = () => {
  const [costumes, setCostumes] = useState<PartInfo[]>([]);
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const partsContext = useContext(PartsContext);
  const { playClick, playSuccess } = useSound();
  const { t } = useTranslation();

  useEffect(() => {
    fetch('/api/costume')
      .then(res => res.json())
      .then(data => setCostumes(data));
  }, []);

  // 衣装選択時にContextへ保存
  useEffect(() => {
    if (!partsContext) return;
    partsContext.setSelectedParts(prev => ({
      ...prev,
      costume: costumes[idx] || null
    }));
    // eslint-disable-next-line
  }, [idx, costumes]);

  const handlePrev = () => {
    playClick();
    setIdx((idx - 1 + costumes.length) % costumes.length);
  };
  const handleNext = () => {
    playClick();
    setIdx((idx + 1) % costumes.length);
  };
  const handleNextPage = (e: React.FormEvent) => {
    e.preventDefault();
    playSuccess();
    navigate('/photo');
  };

  return (
    <PageTransition>
      <SparkleEffect />
      <div className="main-container">
        <h1>{t.costumeSelect.title}</h1>
        <div className="select-container">
          {costumes.length > 0 ? (
            <>
              <button onClick={handlePrev}>←</button>
              <div id="costume-info">
                <img src={costumes[idx].assetPath} alt="衣装画像" style={{ maxWidth: 200, maxHeight: 200 }} />
                <div>{costumes[idx].name}</div>
              </div>
              <button onClick={handleNext}>→</button>
            </>
          ) : (
            <div>{t.common.noData}</div>
          )}
        </div>
        <form onSubmit={handleNextPage}>
          <button type="submit">{t.common.next}</button>
        </form>
        <nav>
          <Link to="/background" onClick={playClick}>{t.costumeSelect.backToBackground}</Link> |
          <Link to="/title" onClick={playClick}>{t.common.backToTitle}</Link>
        </nav>
      </div>
    </PageTransition>
  );
};

export default CostumeSelect;
