import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 仮データ: 実際はAPIから取得
const mockBackgrounds = [
  { id: 1, name: '背景1', assetPath: '/assets/img/bg/bg1.png' },
  { id: 2, name: '背景2', assetPath: '/assets/img/bg/bg2.png' },
];

const BackgroundSelect: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const backgrounds = mockBackgrounds; // TODO: API連携

  const handlePrev = () => setIdx((idx - 1 + backgrounds.length) % backgrounds.length);
  const handleNext = () => setIdx((idx + 1) % backgrounds.length);
  const handleNextPage = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/costume');
  };

  return (
    <div className="main-container">
      <h1>背景選択</h1>
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
          <div>未設定です</div>
        )}
      </div>
      <form onSubmit={handleNextPage}>
        <button type="submit">つぎへ</button>
      </form>
      <nav>
        <a href="/character">キャラクター選択へ戻る</a> |
        <a href="/title">タイトルへ戻る</a>
      </nav>
    </div>
  );
};

export default BackgroundSelect;
