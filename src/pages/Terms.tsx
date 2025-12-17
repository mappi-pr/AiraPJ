import React from 'react';
import texts from '../locales/ja.json';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

const Terms: React.FC = () => {
  const { playClick } = useSound();
  return (
    <PageTransition>
      <SparkleEffect />
      <div className="main-container">
        <h1>{texts.terms.title}</h1>
        {/* 規約・クレジット内容をここに記載 */}
        <nav>
          <a href="/title" onClick={playClick}>{texts.common.backToTitle}</a>
        </nav>
      </div>
    </PageTransition>
  );
};

export default Terms;
