import React from 'react';
import texts from '../locales/ja.json';

const Photo: React.FC = () => {
  return (
    <div className="main-container">
      <h1>{texts.photo.title}</h1>
      {/* 撮影・キャプチャUIをここに実装 */}
      <nav>
        <a href="/title">{texts.common.backToTitle}</a>
      </nav>
    </div>
  );
};

export default Photo;
