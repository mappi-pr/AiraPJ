import React from 'react';
import texts from '../locales/ja.json';

const Terms: React.FC = () => {
  return (
    <div className="main-container">
      <h1>{texts.terms.title}</h1>
      {/* 規約・クレジット内容をここに記載 */}
      <nav>
        <a href="/title">{texts.common.backToTitle}</a>
      </nav>
    </div>
  );
};

export default Terms;
