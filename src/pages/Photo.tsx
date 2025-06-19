import React from 'react';

const Photo: React.FC = () => {
  return (
    <div className="main-container">
      <h1>フリー撮影モード</h1>
      {/* 撮影・キャプチャUIをここに実装 */}
      <nav>
        <a href="/title">タイトルへ戻る</a>
      </nav>
    </div>
  );
};

export default Photo;
