import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import texts from '../locales/ja.json';

const BackgroundSelect: React.FC = () => {
  const [backgrounds, setBackgrounds] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/background')
      .then(res => res.json())
      .then(data => setBackgrounds(data));
  }, []);

  const handlePrev = () => setIdx((idx - 1 + backgrounds.length) % backgrounds.length);
  const handleNext = () => setIdx((idx + 1) % backgrounds.length);
  const handleNextPage = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/costume');
  };

  return (
    <div className="main-container">
      <h1>{texts.backgroundSelect.title}</h1>
      <div className="select-container">
        {backgrounds.length > 0 ? (
          <>
            <button onClick={handlePrev}>←</button>
            <div id="background-info">
              <img src={backgrounds[idx].assetPath} alt="背景画像" style={{ maxWidth: 200, maxHeight: 200 }} />
              <div>{backgrounds[idx].name}</div>
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
        <a href="/character">{texts.backgroundSelect.backToCharacter}</a> |
        <a href="/title">{texts.common.backToTitle}</a>
      </nav>
    </div>
  );
};

export default BackgroundSelect;
