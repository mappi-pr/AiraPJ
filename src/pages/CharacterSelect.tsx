import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CharacterSelect: React.FC = () => {
  const [characters, setCharacters] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/character')
      .then(res => res.json())
      .then(data => setCharacters(data));
  }, []);

  const handlePrev = () => setIdx((idx - 1 + characters.length) % characters.length);
  const handleNext = () => setIdx((idx + 1) % characters.length);
  const handleNextPage = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/background');
  };

  return (
    <div className="main-container">
      <h1>キャラクター選択</h1>
      <div className="select-container">
        {characters.length > 0 ? (
          <>
            <button onClick={handlePrev}>←</button>
            <div id="character-info">
              <img src={characters[idx].assetPath} alt="キャラクター画像" style={{ maxWidth: 200, maxHeight: 200 }} />
              <div>{characters[idx].name}</div>
            </div>
            <button onClick={handleNext}>→</button>
          </>
        ) : (
          <div>未設定です</div>
        )}
      </div>
      <form onSubmit={handleNextPage}>
        <button type="submit">つぎへ</button>
      </form>
      <nav>
        <a href="/title">タイトルへ戻る</a>
      </nav>
    </div>
  );
};

export default CharacterSelect;
