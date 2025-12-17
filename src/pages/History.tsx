import React from 'react';
import texts from '../locales/ja.json';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

const History: React.FC = () => {
  const { playClick } = useSound();
  return (
    <PageTransition>
      <SparkleEffect />
      <div className="main-container">
        <h1>{texts.history.title}</h1>
        {/* 履歴表示UIをここに実装 */}
        <nav>
          <a href="/title" onClick={playClick}>{texts.common.backToTitle}</a>
        </nav>
      </div>
    </PageTransition>
  );
};

export default History;
