import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CostumeSelect: React.FC = () => {
  const [costumes, setCostumes] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/costume')
      .then(res => res.json())
      .then(data => setCostumes(data));
  }, []);

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
