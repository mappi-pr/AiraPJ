import React, { useContext, useRef } from 'react';
import texts from '../locales/ja.json';
import { PartsContext } from '../context/PartsContextOnly';
import html2canvas from 'html2canvas';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

const Photo: React.FC = () => {
  // ドラッグ用state
  const [dragPos, setDragPos] = React.useState({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const { playClick, playSuccess } = useSound();

  // ドラッグ中のグローバルイベント監視
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

  const partsContext = useContext(PartsContext);
  const photoRef = useRef<HTMLDivElement>(null);
  if (!partsContext) return <div>パーツ情報が取得できません</div>;
  const { selectedParts, scale, setScale } = partsContext;

  // デバッグ用: 選択中パーツ情報を表示
  // console.log('selectedParts', selectedParts);

  // PNG保存
  const handleDownload = async () => {
    playSuccess();
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

  return (
    <PageTransition>
      <SparkleEffect />
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
                backgroundImage: `url(${selectedParts.background.assetPath})`,
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
                  backgroundImage: `url(${selectedParts.backHair.assetPath})`,
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
                  backgroundImage: `url(${selectedParts.costume.assetPath})`,
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
                  backgroundImage: `url(${selectedParts.face.assetPath})`,
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
                  backgroundImage: `url(${selectedParts.frontHair.assetPath})`,
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            )}
          </div>
        </div>
        <button onClick={handleDownload}>PNGで保存</button>
        <button onClick={() => { playClick(); setDragPos({ x: 0, y: 0 }); }}>位置リセット</button>
        <nav>
          <a href="/title" onClick={playClick}>{texts.common.backToTitle}</a>
        </nav>
      </div>
    </PageTransition>
  );
};

export default Photo;
