import React from 'react';
import { Link } from 'react-router-dom';
import texts from '../locales/ja.json';

const History: React.FC = () => {
  return (
    <div className="main-container">
      <h1>{texts.history.title}</h1>
      {/* 履歴表示UIをここに実装 */}
      <nav>
        <Link to="/title">{texts.common.backToTitle}</Link>
      </nav>
    </div>
  );
};

export default History;
