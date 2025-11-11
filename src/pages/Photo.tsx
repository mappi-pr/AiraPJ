import React, { useContext, useRef } from 'react';
import texts from '../locales/ja.json';
import { PartsContext } from '../context/PartsContextOnly';
import type { PartInfo, StickerInstance } from '../context/PartsContextOnly';
import html2canvas from 'html2canvas';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const Photo: React.FC = () => {
  const partsContext = useContext(PartsContext);
  const photoRef = useRef<HTMLDivElement>(null);
  
  // ドラッグ用state
  const [dragPos, setDragPos] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // ステッカー関連state
  const [availableStickers, setAvailableStickers] = React.useState<PartInfo[]>([]);
  const [showStickerPanel, setShowStickerPanel] = React.useState(false);
  const [draggingSticker, setDraggingSticker] = React.useState<number | null>(null);
  const stickerDragOffset = useRef({ x: 0, y: 0 });

  // ドラッグ中のグローバルイベント監視（キャラクター用）
  React.useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      let clientX, clientY;
      if (e instanceof TouchEvent) {
        clientX = e.touches[0]?.clientX ?? 0;
        clientY = e.touches[0]?.clientY ?? 0;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      setDragPos({
        x: clientX - dragOffset.current.x,
        y: clientY - dragOffset.current.y,
      });
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragging]);

  // ステッカードラッグ中のグローバルイベント監視
  React.useEffect(() => {
    if (draggingSticker === null) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      let clientX, clientY;
      if (e instanceof TouchEvent) {
        clientX = e.touches[0]?.clientX ?? 0;
        clientY = e.touches[0]?.clientY ?? 0;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      if (!partsContext) return;
      const newStickers = [...partsContext.selectedParts.stickers];
      newStickers[draggingSticker] = {
        ...newStickers[draggingSticker],
        x: clientX - stickerDragOffset.current.x,
        y: clientY - stickerDragOffset.current.y,
      };
      partsContext.setSelectedParts(prev => ({ ...prev, stickers: newStickers }));
    };
    const handleUp = () => setDraggingSticker(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [draggingSticker, partsContext]);

  // ステッカー一覧の取得
  React.useEffect(() => {
    fetch('/api/sticker')
      .then(res => res.json())
      .then(data => setAvailableStickers(data))
      .catch(err => console.error('Failed to fetch stickers:', err));
  }, []);

  if (!partsContext) return <div>パーツ情報が取得できません</div>;
  const { selectedParts, scale, setScale } = partsContext;

  // デバッグ用: 選択中パーツ情報を表示
  // console.log('selectedParts', selectedParts);

  // PNG保存
  const handleDownload = async () => {
    if (photoRef.current) {
      const canvas = await html2canvas(photoRef.current, { useCORS: true, background: undefined });
      const link = document.createElement('a');
      link.download = 'my_character.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  // ドラッグ開始
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = {
      x: clientX - dragPos.x,
      y: clientY - dragPos.y,
    };
  };

  // ステッカー追加
  const handleAddSticker = (sticker: PartInfo) => {
    if (!partsContext) return;
    const newSticker: StickerInstance = {
      sticker,
      x: 120, // 中央
      y: 160,
      scale: 0.5,
    };
    partsContext.setSelectedParts(prev => ({
      ...prev,
      stickers: [...prev.stickers, newSticker],
    }));
    setShowStickerPanel(false);
  };

  // ステッカードラッグ開始
  const handleStickerDragStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    index: number
  ) => {
    e.stopPropagation();
    setDraggingSticker(index);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    if (!partsContext) return;
    const sticker = partsContext.selectedParts.stickers[index];
    stickerDragOffset.current = {
      x: clientX - sticker.x,
      y: clientY - sticker.y,
    };
  };

  // ステッカー削除
  const handleRemoveSticker = (index: number) => {
    if (!partsContext) return;
    const newStickers = partsContext.selectedParts.stickers.filter((_, i) => i !== index);
    partsContext.setSelectedParts(prev => ({ ...prev, stickers: newStickers }));
  };

  // ステッカー拡大率変更
  const handleStickerScale = (index: number, newScale: number) => {
    if (!partsContext) return;
    const newStickers = [...partsContext.selectedParts.stickers];
    newStickers[index] = { ...newStickers[index], scale: newScale };
    partsContext.setSelectedParts(prev => ({ ...prev, stickers: newStickers }));
  };

  return (
    <div className="main-container">
      <h1>{texts.photo.title}</h1>
      <div style={{ margin: '16px 0' }}>
        <label>
          拡大率
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.01}
            value={scale}
            onChange={e => setScale(Number(e.target.value))}
          />
          {scale}倍
        </label>
      </div>
      <div
        ref={photoRef}
        style={{
          position: 'relative',
          width: 240,
          height: 320,
          background: '#eee',
          margin: '0 auto',
          overflow: 'hidden', // 追加
        }}
      >
        {/* 背景（固定） */}
        {selectedParts.background ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 240,
              height: 320,
              zIndex: 0,
              backgroundImage: `url(${API_BASE_URL + selectedParts.background.assetPath})`,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
            }}
          />
        ) : (
          <div style={{position:'absolute',left:0,top:0,width:240,height:320,zIndex:0,background:'#ccc',color:'#888',display:'flex',alignItems:'center',justifyContent:'center'}}>背景未選択</div>
        )}
        {/* パーツ重ね順: 後髪→衣装→顔→前髪 */}
        <div
          style={{
            position: 'absolute',
            left: dragPos.x,
            top: dragPos.y,
            width: 240,
            height: 320,
            zIndex: 1,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            cursor: dragging ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          {selectedParts.backHair && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 240,
                height: 320,
                zIndex: 1,
                backgroundImage: `url(${API_BASE_URL + selectedParts.backHair.assetPath})`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
              }}
            />
          )}
          {selectedParts.costume ? (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 240,
                height: 320,
                zIndex: 2,
                backgroundImage: `url(${API_BASE_URL + selectedParts.costume.assetPath})`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
              }}
            />
          ) : (
            <div style={{position:'absolute',left:0,top:0,width:240,height:320,zIndex:2,background:'rgba(255,255,255,0.2)',color:'#888',display:'flex',alignItems:'center',justifyContent:'center'}}>衣装未選択</div>
          )}
          {selectedParts.face && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 240,
                height: 320,
                zIndex: 3,
                backgroundImage: `url(${API_BASE_URL + selectedParts.face.assetPath})`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
              }}
            />
          )}
          {selectedParts.frontHair && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 240,
                height: 320,
                zIndex: 4,
                backgroundImage: `url(${API_BASE_URL + selectedParts.frontHair.assetPath})`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
              }}
            />
          )}
        </div>
        {/* ステッカーレイヤー（最前面） */}
        {selectedParts.stickers.map((stickerInstance, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: stickerInstance.x,
              top: stickerInstance.y,
              zIndex: 100 + index,
              cursor: draggingSticker === index ? 'grabbing' : 'grab',
              touchAction: 'none',
              transform: `scale(${stickerInstance.scale})`,
              transformOrigin: 'center center',
            }}
            onMouseDown={(e) => handleStickerDragStart(e, index)}
            onTouchStart={(e) => handleStickerDragStart(e, index)}
          >
            <img
              src={API_BASE_URL + stickerInstance.sticker.assetPath}
              alt={stickerInstance.sticker.name}
              style={{ width: 100, height: 100, objectFit: 'contain', pointerEvents: 'none' }}
            />
          </div>
        ))}
      </div>
      <button onClick={handleDownload}>PNGで保存</button>
      <button onClick={() => setDragPos({ x: 0, y: 0 })}>位置リセット</button>
      <button onClick={() => setShowStickerPanel(!showStickerPanel)}>
        ステッカー追加
      </button>
      
      {/* ステッカー選択パネル */}
      {showStickerPanel && (
        <div style={{ 
          margin: '16px 0', 
          padding: '16px', 
          border: '1px solid #ccc', 
          borderRadius: '8px',
          background: '#f9f9f9' 
        }}>
          <h3>ステッカーを選択</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {availableStickers.length > 0 ? (
              availableStickers.map(sticker => (
                <div
                  key={sticker.id}
                  onClick={() => handleAddSticker(sticker)}
                  style={{
                    cursor: 'pointer',
                    border: '2px solid #ddd',
                    borderRadius: '4px',
                    padding: '8px',
                    textAlign: 'center',
                    background: 'white',
                  }}
                >
                  <img
                    src={API_BASE_URL + sticker.assetPath}
                    alt={sticker.name}
                    style={{ width: 60, height: 60, objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>{sticker.name}</div>
                </div>
              ))
            ) : (
              <div>ステッカーが登録されていません</div>
            )}
          </div>
          <button onClick={() => setShowStickerPanel(false)} style={{ marginTop: '8px' }}>
            閉じる
          </button>
        </div>
      )}
      
      {/* ステッカー管理パネル */}
      {selectedParts.stickers.length > 0 && (
        <div style={{ 
          margin: '16px 0', 
          padding: '16px', 
          border: '1px solid #ccc', 
          borderRadius: '8px',
          background: '#f0f0f0' 
        }}>
          <h3>配置済みステッカー</h3>
          {selectedParts.stickers.map((stickerInstance, index) => (
            <div key={index} style={{ 
              marginBottom: '8px', 
              padding: '8px', 
              background: 'white', 
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <img
                src={API_BASE_URL + stickerInstance.sticker.assetPath}
                alt={stickerInstance.sticker.name}
                style={{ width: 40, height: 40, objectFit: 'contain' }}
              />
              <div style={{ flex: 1 }}>
                <div>{stickerInstance.sticker.name}</div>
                <div style={{ fontSize: '12px' }}>
                  <label>
                    拡大率: 
                    <input
                      type="range"
                      min={0.1}
                      max={2}
                      step={0.1}
                      value={stickerInstance.scale}
                      onChange={(e) => handleStickerScale(index, Number(e.target.value))}
                      style={{ width: '100px', marginLeft: '8px' }}
                    />
                    {stickerInstance.scale.toFixed(1)}倍
                  </label>
                </div>
              </div>
              <button onClick={() => handleRemoveSticker(index)}>削除</button>
            </div>
          ))}
        </div>
      )}
      
      <nav>
        <a href="/title">{texts.common.backToTitle}</a>
      </nav>
    </div>
  );
};

export default Photo;
