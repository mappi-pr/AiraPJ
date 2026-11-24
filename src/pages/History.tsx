import React, { useEffect, useState, useContext } from 'react';
import texts from '../locales/ja.json';
import { getUserId } from '../utils/user';
import axios from 'axios';
import { PartsContext } from '../context/PartsContextOnly';
import type { StickerInstance } from '../context/PartsContextOnly';
import { useNavigate } from 'react-router-dom';

// 生成履歴に保存されたステッカー配置1枚分（Issue #165）。並び順＝重なり順。
interface StickerPlacementData {
  stickerId: number;
  x: number;
  y: number;
}

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
  // 配置情報のない既存履歴では null / undefined になる
  stickers?: StickerPlacementData[] | null;
  createdAt: string;
  isAvailable?: boolean; // Track if all parts are still available
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
        const historiesData: GenerationHistoryItem[] = response.data;

        // 可用性（参照パーツがすべて現存するか）はサーバ側で一括判定され、
        // isAvailable として返ってくる。利用できない履歴は一覧から除く。
        setHistories(historiesData.filter(h => h.isAvailable !== false));
      } catch (error) {
        console.error('Failed to fetch generation history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistories();
  }, []);

  const handleView = async (history: GenerationHistoryItem) => {
    if (!partsContext) return;

    // Load all parts data to view
    try {
      const [backgrounds, costumes, backHairs, faces, frontHairs] = await Promise.all([
        history.backgroundId ? axios.get(`/api/background/${history.backgroundId}`) : null,
        history.costumeId ? axios.get(`/api/costume/${history.costumeId}`) : null,
        history.backHairId ? axios.get(`/api/back-hair/${history.backHairId}`) : null,
        history.faceId ? axios.get(`/api/face/${history.faceId}`) : null,
        history.frontHairId ? axios.get(`/api/front-hair/${history.frontHairId}`) : null,
      ]);

      // ステッカー配置を復元する（Issue #165）。各ステッカーはパーツ類と同様に
      // 個別取得するが、論理削除済みなどで取得できないものはエラーにせず
      // その配置だけをスキップする。並び順（重なり順）は保存時のまま保つ。
      const placements = Array.isArray(history.stickers) ? history.stickers : [];
      const restoredStickers = (
        await Promise.all(
          placements.map(async (placement): Promise<StickerInstance | null> => {
            try {
              const res = await axios.get(`/api/sticker/${placement.stickerId}`);
              return { sticker: res.data, x: placement.x, y: placement.y };
            } catch {
              return null;
            }
          })
        )
      ).filter((s): s is StickerInstance => s !== null);

      partsContext.setSelectedParts({
        background: backgrounds?.data || null,
        costume: costumes?.data || null,
        backHair: backHairs?.data || null,
        face: faces?.data || null,
        frontHair: frontHairs?.data || null,
        stickers: restoredStickers,
      });
      partsContext.setScale(history.scale);
      partsContext.setDragPos({ x: history.dragX, y: history.dragY });

      // Navigate to photo page
      navigate('/photo');
    } catch (error) {
      console.error('Failed to view generation:', error);
      alert(texts.history.viewFail);
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
                <div>{texts.history.backgroundId}: {history.backgroundId || texts.history.notSelected}</div>
                <div>{texts.history.costumeId}: {history.costumeId || texts.history.notSelected}</div>
                <div>{texts.history.backHairId}: {history.backHairId || texts.history.notSelected}</div>
                <div>{texts.history.faceId}: {history.faceId || texts.history.notSelected}</div>
                <div>{texts.history.frontHairId}: {history.frontHairId || texts.history.notSelected}</div>
                <div>{texts.history.scale}: {history.scale}{texts.history.scaleUnit}</div>
              </div>
              <button 
                onClick={() => handleView(history)} 
                style={{ width: '100%', fontSize: '12px' }}
              >
                {texts.history.view}
              </button>
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
