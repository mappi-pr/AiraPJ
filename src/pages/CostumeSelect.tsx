import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 仮データ: 実際はAPIから取得
const mockCostumes = [
  { id: 1, name: '衣装1', assetPath: '/assets/img/csm/costume1.png' },
  { id: 2, name: '衣装2', assetPath: '/assets/img/csm/costume2.png' },
];

const CostumeSelect: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();
  const costumes = mockCostumes; // TODO: API連携

  const handlePrev = () => setIdx((idx - 1 + costumes.length) % costumes.length);
  const handleNext = () => setIdx((idx + 1) % costumes.length);
  const handleNextPage = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/photo');
  };

  return (
    <div className="main-container">
      <h1>衣装選択</h1>
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
          <div>未設定です</div>
        )}
      </div>
      <form onSubmit={handleNextPage}>
        <button type="submit">つぎへ</button>
      </form>
      <nav>
        <a href="/background">背景選択へ戻る</a> |
        <a href="/title">タイトルへ戻る</a>
      </nav>
    </div>
  );
};

export default CostumeSelect;
