import React, { useEffect, useState, useContext } from 'react';
import texts from '../locales/ja.json';
import { getUserId } from '../utils/user';
import axios from 'axios';
import { PartsContext } from '../context/PartsContextOnly';
import { useNavigate } from 'react-router-dom';

interface GenerationHistoryItem {
  id: number;
  userId: string;
  backgroundId: number | null;
  costumeId: number | null;
  backHairId: number | null;
  faceId: number | null;
  frontHairId: number | null;
  scale: number;
  dragX: number;
  dragY: number;
  createdAt: string;
}

const History: React.FC = () => {
  const [histories, setHistories] = useState<GenerationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const partsContext = useContext(PartsContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistories = async () => {
      try {
        const userId = getUserId();
        const response = await axios.get(`/api/generation-history?userId=${userId}`);
        setHistories(response.data);
      } catch (error) {
        console.error('Failed to fetch generation history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistories();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm(texts.history.deleteConfirm)) return;

    try {
      const userId = getUserId();
      await axios.delete(`/api/generation-history/${id}?userId=${userId}`);
      setHistories(histories.filter(h => h.id !== id));
    } catch (error) {
      console.error('Failed to delete generation history:', error);
      alert(texts.history.deleteFail);
    }
  };

  const handleRestore = async (history: GenerationHistoryItem) => {
    if (!partsContext) return;

    // Load all parts data to restore
    try {
      const [backgrounds, costumes, backHairs, faces, frontHairs] = await Promise.all([
        history.backgroundId ? axios.get(`/api/background/${history.backgroundId}`) : null,
        history.costumeId ? axios.get(`/api/costume/${history.costumeId}`) : null,
        history.backHairId ? axios.get(`/api/back-hair/${history.backHairId}`) : null,
        history.faceId ? axios.get(`/api/face/${history.faceId}`) : null,
        history.frontHairId ? axios.get(`/api/front-hair/${history.frontHairId}`) : null,
      ]);

      partsContext.setSelectedParts({
        background: backgrounds?.data || null,
        costume: costumes?.data || null,
        backHair: backHairs?.data || null,
        face: faces?.data || null,
        frontHair: frontHairs?.data || null,
      });
      partsContext.setScale(history.scale);

      // Navigate to photo page
      navigate('/photo');
    } catch (error) {
      console.error('Failed to restore generation:', error);
      alert(texts.history.restoreFail);
    }
  };

  if (loading) {
    return (
      <div className="main-container">
        <h1>{texts.history.title}</h1>
        <p>{texts.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="main-container">
      <h1>{texts.history.title}</h1>
      {histories.length === 0 ? (
        <p>{texts.history.noHistory}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {histories.map(history => (
            <div
              key={history.id}
              style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '8px',
                background: '#f9f9f9',
              }}
            >
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                {new Date(history.createdAt).toLocaleString('ja-JP')}
              </div>
              <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                <div>背景ID: {history.backgroundId || '未選択'}</div>
                <div>衣装ID: {history.costumeId || '未選択'}</div>
                <div>後髪ID: {history.backHairId || '未選択'}</div>
                <div>顔ID: {history.faceId || '未選択'}</div>
                <div>前髪ID: {history.frontHairId || '未選択'}</div>
                <div>拡大率: {history.scale}倍</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleRestore(history)} style={{ flex: 1, fontSize: '12px' }}>
                  {texts.history.restore}
                </button>
                <button onClick={() => handleDelete(history.id)} style={{ flex: 1, fontSize: '12px' }}>
                  {texts.history.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <nav style={{ marginTop: '24px' }}>
        <a href="/title">{texts.common.backToTitle}</a>
      </nav>
    </div>
  );
};

export default History;
