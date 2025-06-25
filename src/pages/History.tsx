import React from 'react';
import texts from '../locales/ja.json';

const History: React.FC = () => {
  return (
    <div className="main-container">
      <h1>{texts.history.title}</h1>
      {/* 履歴表示UIをここに実装 */}
      <nav>
        <a href="/title">{texts.common.backToTitle}</a>
      </nav>
    </div>
  );
};

export default History;
