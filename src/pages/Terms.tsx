import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

const Terms: React.FC = () => {
  const { playClick } = useSound();
  const { t } = useTranslation();
  return (
    <PageTransition>
      <SparkleEffect />
      <div className="main-container">
        <h1>{t.terms.title}</h1>
        {/* 規約・クレジット内容をここに記載 */}
        <nav>
          <Link to="/title" onClick={playClick}>{t.common.backToTitle}</Link>
        </nav>
      </div>
    </PageTransition>
  );
};

export default Terms;
