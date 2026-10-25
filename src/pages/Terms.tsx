import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';
import { ossLicenses } from '../generated/ossLicenses';

const Terms: React.FC = () => {
  const { playClick } = useSound();
  const { t } = useTranslation();
  
  return (
    <PageTransition>
      <SparkleEffect />
      <div className="main-container">
        <h1>{t.terms.title}</h1>
        
        <section style={{ marginBottom: '2rem', textAlign: 'left' }}>
          <h2>{t.terms.ossLicenses}</h2>
          
          <div style={{ 
            maxHeight: '400px', 
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: 'rgba(0, 0, 0, 0.2)'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '0.9rem'
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.3)' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.terms.library}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.terms.version}</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t.terms.license}</th>
                </tr>
              </thead>
              <tbody>
                {ossLicenses.map((lib) => (
                  <tr 
                    key={`${lib.scope}:${lib.name}:${lib.version}`}
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      <a 
                        href={lib.url}
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          color: '#4a90e2',
                          textDecoration: 'none',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#6bb3ff';
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#4a90e2';
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                      >
                        {lib.name}
                      </a>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                      {lib.version}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                      {lib.license}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        
        <nav>
          <Link to="/title" onClick={playClick}>{t.common.backToTitle}</Link>
        </nav>
      </div>
    </PageTransition>
  );
};

export default Terms;
