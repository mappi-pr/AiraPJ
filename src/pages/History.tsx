import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

const History: React.FC = () => {
  const { playClick } = useSound();
  const { t } = useTranslation();
  return (
    <PageTransition>
      <SparkleEffect />
      <div className="main-container">
        <h1>{t.history.title}</h1>
        {/* 履歴表示UIをここに実装 */}
        <nav>
          <Link to="/title" onClick={playClick}>{t.common.backToTitle}</Link>
        </nav>
      </div>
    </PageTransition>
  );
};

export default History;
