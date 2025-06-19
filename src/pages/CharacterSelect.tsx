import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 仮データ: 実際はAPIから取得
const mockCharacters = [
  { id: 1, name: 'キャラ1', assetPath: '/assets/img/chr/char1.png' },
  { id: 2, name: 'キャラ2', assetPath: '/assets/img/chr/char2.png' },
];

const CharacterSelect: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const characters = mockCharacters; // TODO: API連携

  const handlePrev = () => setIdx((idx - 1 + characters.length) % characters.length);
  const handleNext = () => setIdx((idx + 1) % characters.length);
  const handleNextPage = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/background');
  };

  // 例: API呼び出し時にuserIdを付与
  // fetch('/api/character?userId=' + getUserId())

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
