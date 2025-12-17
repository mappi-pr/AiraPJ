import React from 'react';
import { Link } from 'react-router-dom';
import texts from '../locales/ja.json';

const Terms: React.FC = () => {
  return (
    <div className="main-container">
      <h1>{texts.terms.title}</h1>
      {/* 規約・クレジット内容をここに記載 */}
      <nav>
        <Link to="/title">{texts.common.backToTitle}</Link>
      </nav>
    </div>
  );
};

export default Terms;
