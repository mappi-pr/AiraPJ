import React, { useEffect, useState, useRef } from 'react';
// 画像の余白（透明部分）をトリミングしてBase64で返す
const trimImage = (src: string): Promise<string> => {
  return new Promise(resolve => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(src);
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const { data, width, height } = imageData;
      let top = height, left = width, right = 0, bottom = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > 16) { // 透明度閾値
            if (x < left) left = x;
            if (x > right) right = x;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
          }
        }
      }
      if (right < left || bottom < top) return resolve(src); // 全部透明
      const w = right - left + 1;
      const h = bottom - top + 1;
      const trimCanvas = document.createElement('canvas');
      trimCanvas.width = w;
      trimCanvas.height = h;
      const trimCtx = trimCanvas.getContext('2d');
      if (!trimCtx) return resolve(src);
      trimCtx.drawImage(canvas, left, top, w, h, 0, 0, w, h);
      resolve(trimCanvas.toDataURL());
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
};
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// パーツ型
export type PartInfo = {
  id: number;
  name: string;
  thumbUrl: string; // サムネイル画像
  imageUrl: string; // 高解像度画像
  assetPath?: string; // API返却の画像パス（例: '/images/xxx.png'）
  imagePath?: string;
};

// キャッシュ用
const partsCache: { [key: string]: PartInfo[] } = {};

interface Props {
  partType: 'face' | 'frontHair' | 'backHair';
  selectedId: number | null;
  onSelect: (part: PartInfo) => void;
}

const getImageSrc = (part: PartInfo): string => {
  if (part.assetPath) {
    return part.assetPath.startsWith('http') ? part.assetPath : API_BASE_URL + part.assetPath;
  }
  if (part.imagePath) {
    return part.imagePath.startsWith('http') ? part.imagePath : API_BASE_URL + part.imagePath;
  }
  if (part.thumbUrl) {
    return part.thumbUrl.startsWith('http') ? part.thumbUrl : API_BASE_URL + part.thumbUrl;
  }
  if (part.imageUrl) {
    return part.imageUrl.startsWith('http') ? part.imageUrl : API_BASE_URL + part.imageUrl;
  }
  return '';
};


const CharacterPartsPanel: React.FC<Props> = ({ partType, selectedId, onSelect }) => {
  const [parts, setParts] = useState<PartInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 非同期でパーツ一覧取得（キャッシュ活用）
  useEffect(() => {
    setFetchError(false); // タブ切り替え時はエラー解除
    const key = `${partType}-page${page}`;
    if (partsCache[key]) {
      setParts(partsCache[key]);
      setHasMore(partsCache[key].length > 0);
      return;
    }
    setLoading(true);
    // partTypeをAPIエンドポイント名に変換（frontHair→front-hair等）
    const apiName = partType === 'frontHair' ? 'front-hair' : partType === 'backHair' ? 'back-hair' : partType;
    fetch(`${API_BASE_URL}/api/${apiName}?page=${page}`)
      .then(res => {
        if (!res.ok) throw new Error('API取得失敗');
        return res.json();
      })
      .then((data: PartInfo[]) => {
        partsCache[key] = data;
        setParts(data);
        setHasMore(data.length > 0);
      })
      .catch(() => {
        setParts([]);
        setHasMore(false);
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [partType, page]);

  // インフィニットスクロール（下部に到達時に追加ロード）
  useEffect(() => {
    const handleScroll = () => {
      if (!panelRef.current || loading || !hasMore) return;
      const { scrollTop, scrollHeight, clientHeight } = panelRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setPage(p => p + 1);
      }
    };
    const ref = panelRef.current;
    if (ref) ref.addEventListener('scroll', handleScroll);
    return () => { if (ref) ref.removeEventListener('scroll', handleScroll); };
  }, [loading, hasMore]);

  // パネル横幅から最大表示数を算出し、表示件数がそれ未満なら左寄せ
  // 画面幅でgapを調整
  const [gap, setGap] = useState(14);
  useEffect(() => {
    const updateGap = () => {
      setGap(window.innerWidth < 600 ? 22 : 14);
    };
    updateGap();
    window.addEventListener('resize', updateGap);
    return () => window.removeEventListener('resize', updateGap);
  }, []);
  const panelStyle: React.CSSProperties = {
    height: 180,
    overflowY: 'auto',
    padding: 8,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))',
    gap,
    alignItems: 'start',
  };
  return (
    <div style={panelStyle} ref={panelRef}>
      {/* API取得失敗時のみエラー表示 */}
      {fetchError && (
        <div style={{ color: '#c00', fontSize: 13 }}>パーツ取得に失敗しました</div>
      )}
      {parts.map(part => (
        <TrimmedButton
          key={part.id}
          part={part}
          selected={part.id === selectedId}
          onSelect={onSelect}
        />
      ))}
      {loading && <div>読み込み中...</div>}
    </div>
  );
};

// 画像余白トリミング済みボタン
interface TrimmedButtonProps {
  part: PartInfo;
  selected: boolean;
  onSelect: (p: PartInfo) => void;
}
const TrimmedButton: React.FC<TrimmedButtonProps> = ({ part, selected, onSelect }) => {
  const [trimmedSrc, setTrimmedSrc] = useState<string>('');
  useEffect(() => {
    let mounted = true;
    const src = getImageSrc(part);
    trimImage(src).then(dataUrl => { if (mounted) setTrimmedSrc(dataUrl); });
    return () => { mounted = false; };
  }, [part]);
  return (
    <button
      type="button"
      style={{
        border: selected ? '2px solid #646cff' : '1px solid #ccc',
        borderRadius: 12,
        background: '#fff',
        padding: 0,
        cursor: 'pointer',
        width: '100%',
        aspectRatio: '1 / 1',
        minWidth: 64,
        minHeight: 64,
        maxWidth: 120,
        maxHeight: 120,
        display: 'block',
        boxSizing: 'border-box',
      }}
      onClick={(e) => { e.preventDefault(); onSelect(part); }}
      title={part.name}
    >
      <img
        src={trimmedSrc || getImageSrc(part)}
        alt=""
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6, background: '#eee' }}
        onError={e => {
          const img = e.currentTarget;
          img.onerror = null;
          img.src = '';
          img.style.background = '#ccc';
        }}
      />
    </button>
  );
};

export default CharacterPartsPanel;
