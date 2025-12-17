import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import texts from '../locales/ja.json';
import { PartsContext } from '../context/PartsContextOnly';
import type { PartInfo } from '../context/PartsContextOnly';

const CostumeSelect: React.FC = () => {
  const [costumes, setCostumes] = useState<PartInfo[]>([]);
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const partsContext = useContext(PartsContext);

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

  const handlePrev = () => setIdx((idx - 1 + costumes.length) % costumes.length);
  const handleNext = () => setIdx((idx + 1) % costumes.length);
  const handleNextPage = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/photo');
  };

  return (
    <div className="main-container">
      <h1>{texts.costumeSelect.title}</h1>
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
          <div>{texts.common.noData}</div>
        )}
      </div>
      <form onSubmit={handleNextPage}>
        <button type="submit">{texts.common.next}</button>
      </form>
      <nav>
        <Link to="/background">{texts.costumeSelect.backToBackground}</Link> |
        <Link to="/title">{texts.common.backToTitle}</Link>
      </nav>
    </div>
  );
};

export default CostumeSelect;
