import React, { useRef, useState } from 'react';
import axios from 'axios';
import texts from '../locales/ja.json';

const assetTypes = [
  { key: 'face', label: texts.settings.faceLabel },
  { key: 'frontHair', label: texts.settings.frontHairLabel },
  { key: 'backHair', label: texts.settings.backHairLabel },
  { key: 'background', label: texts.settings.backgroundLabel },
  { key: 'costume', label: texts.settings.costumeLabel },
];

const ITEMS_PER_PAGE = 12;

const Settings: React.FC = () => {
  const [result, setResult] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [assets, setAssets] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const assetTypeRef = useRef<HTMLSelectElement>(null);
  const assetNameRef = useRef<HTMLInputElement>(null);
  const assetFileRef = useRef<HTMLInputElement>(null);

  // アップロード種別ごとのエンドポイント
  const uploadUrls: Record<string, string> = {
    face: '/api/face/upload',
    frontHair: '/api/front-hair/upload',
    backHair: '/api/back-hair/upload',
    background: '/api/background/upload',
    costume: '/api/costume/upload',
  };

  // セクション展開時のみアセットを取得
  const fetchAssetsForType = async (type: string) => {
    if (assets[type] && assets[type].length > 0) return; // 既にロード済み
    
    setLoading(true);
    try {
      const res = await axios.get(`${uploadUrls[type].replace('/upload', '')}`);
      setAssets((prev) => ({ ...prev, [type]: res.data || [] }));
    } catch {
      setAssets((prev) => ({ ...prev, [type]: [] }));
    }
    setLoading(false);
  };

  // アセットリストの再取得
  const refreshAssetsForType = async (type: string) => {
    setAssets((prev) => {
      const newAssets = { ...prev };
      delete newAssets[type];
      return newAssets;
    });
    await fetchAssetsForType(type);
  };

  // セクションの展開/折りたたみ
  const toggleSection = async (type: string) => {
    const isExpanding = !expandedSections[type];
    setExpandedSections((prev) => ({ ...prev, [type]: isExpanding }));
    
    if (isExpanding) {
      await fetchAssetsForType(type);
    }
  };

  // アップロード
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const type = assetTypeRef.current?.value;
    const name = assetNameRef.current?.value;
    const file = assetFileRef.current?.files?.[0];
    if (!file || file.type !== 'image/png') {
      setResult(texts.settings.pngOnly);
      return;
    }
    if (!type || !uploadUrls[type]) {
      setResult(texts.settings.selectType);
      return;
    }
    const formData = new FormData();
    formData.append('name', name || '');
    formData.append('asset', file);
    const url = uploadUrls[type];
    try {
      const res = await axios.post(url, formData);
      const data = res.data;
      // パーツ・背景・衣装いずれかのレスポンスに対応
      const assetPath = data.assetPath || data.face?.assetPath || data.frontHair?.assetPath || data.backHair?.assetPath || data.background?.assetPath || data.costume?.assetPath;
      const id = data.id || data.face?.id || data.frontHair?.id || data.backHair?.id || data.background?.id || data.costume?.id;
      if (assetPath && id) {
        setResult(
          `${texts.settings.resultSuccess}\nID: ${id}\n画像: <img src="${assetPath}" width="100" />`
        );
        // アップロード後、該当タイプのアセットリストを再取得
        if (type) {
          await refreshAssetsForType(type);
        }
      } else {
        setResult(data.error || texts.settings.resultFail);
      }
    } catch {
      setResult(texts.settings.resultFail);
    }
  };

  // 削除
  const handleDelete = async (type: string, id: number) => {
    if (!window.confirm(texts.settings.deleteConfirm)) return;
    try {
      await axios.delete(`${uploadUrls[type].replace('/upload', '')}/${id}`);
      // 削除後、該当タイプのアセットリストを再取得
      await refreshAssetsForType(type);
      setResult(texts.settings.deleteSuccess);
    } catch {
      setResult(texts.settings.deleteFail);
    }
  };

  // フィルタリングされたアセット取得
  const getFilteredAssets = (type: string) => {
    const assetList = assets[type] || [];
    const searchTerm = searchTerms[type]?.toLowerCase() || '';
    
    if (!searchTerm) return assetList;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return assetList.filter((item: any) =>
      item.name?.toLowerCase().includes(searchTerm)
    );
  };

  // ページネーション情報取得
  const getPaginatedAssets = (type: string) => {
    const filtered = getFilteredAssets(type);
    const currentPage = currentPages[type] || 1;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    
    return {
      items: filtered.slice(startIndex, endIndex),
      totalPages: Math.ceil(filtered.length / ITEMS_PER_PAGE),
      currentPage,
      totalItems: filtered.length,
    };
  };

  // ページ変更
  const handlePageChange = (type: string, page: number) => {
    setCurrentPages((prev) => ({ ...prev, [type]: page }));
  };

  // 検索変更
  const handleSearchChange = (type: string, value: string) => {
    setSearchTerms((prev) => ({ ...prev, [type]: value }));
    setCurrentPages((prev) => ({ ...prev, [type]: 1 })); // 検索時は1ページ目に戻る
  };

  return (
    <div className="main-container">
      <h1>{texts.settings.title}</h1>
      <nav>
        <a href="/title">{texts.common.backToTitle}</a>
      </nav>
      <h2>{texts.settings.uploadTitle}</h2>
      <form id="uploadForm" onSubmit={handleUpload} encType="multipart/form-data">
        <label>
          {texts.settings.typeLabel}
          <select name="type" ref={assetTypeRef}>
            <option value="face">顔パーツ</option>
            <option value="frontHair">前髪パーツ</option>
            <option value="backHair">後髪パーツ</option>
            <option value="background">背景</option>
            <option value="costume">衣装</option>
          </select>
        </label>
        <br />
        <label>
          {texts.settings.nameLabel} <input type="text" name="name" ref={assetNameRef} required />
        </label>
        <br />
        <input type="file" name="asset" ref={assetFileRef} accept="image/png" required />
        <br />
        <button type="submit">{texts.settings.uploadBtn}</button>
      </form>
      <div id="uploadResult" dangerouslySetInnerHTML={{ __html: result }} />

      <h2>{texts.settings.assetListTitle}</h2>
      <div className="asset-sections">
        {assetTypes.map(({ key, label }) => {
          const isExpanded = expandedSections[key];
          const pagination = isExpanded ? getPaginatedAssets(key) : null;
          
          return (
            <section key={key} className="asset-section">
              <div 
                className="section-header"
                onClick={() => toggleSection(key)}
                style={{ 
                  cursor: 'pointer',
                  padding: '12px 16px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  marginBottom: isExpanded ? '12px' : '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  userSelect: 'none',
                }}
              >
                <h3 style={{ margin: 0 }}>
                  {isExpanded ? '▼' : '▶'} {label}
                  {assets[key] && ` (${assets[key].length}件)`}
                </h3>
              </div>
              
              {isExpanded && (
                <div className="section-content">
                  {loading && !assets[key] ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                      {texts.common.loading}
                    </div>
                  ) : pagination && pagination.totalItems > 0 ? (
                    <>
                      {/* 検索バー */}
                      <div style={{ marginBottom: '12px' }}>
                        <input
                          type="text"
                          placeholder="名前で検索..."
                          value={searchTerms[key] || ''}
                          onChange={(e) => handleSearchChange(key, e.target.value)}
                          style={{
                            padding: '8px 12px',
                            width: '100%',
                            maxWidth: '300px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                          }}
                        />
                        <span style={{ marginLeft: '12px', color: '#666' }}>
                          {pagination.totalItems}件中 {Math.min((pagination.currentPage - 1) * ITEMS_PER_PAGE + 1, pagination.totalItems)}-
                          {Math.min(pagination.currentPage * ITEMS_PER_PAGE, pagination.totalItems)}件を表示
                        </span>
                      </div>

                      {/* アセットリスト */}
                      <ul className="asset-list" style={{ 
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '16px',
                        listStyle: 'none',
                        padding: 0,
                      }}>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {pagination.items.map((item: any) => (
                          <li key={item.id} style={{
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                          }}>
                            <img 
                              src={item.assetPath} 
                              alt={item.name} 
                              loading="lazy"
                              style={{ 
                                width: '100%',
                                height: '120px',
                                objectFit: 'contain',
                                backgroundColor: '#f9f9f9',
                                borderRadius: '4px',
                              }} 
                            />
                            <span style={{ 
                              fontSize: '14px',
                              fontWeight: 'bold',
                              textAlign: 'center',
                              wordBreak: 'break-word',
                            }}>
                              {item.name}
                            </span>
                            <button 
                              onClick={() => handleDelete(key, item.id)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#ff4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                              }}
                            >
                              {texts.settings.deleteBtn}
                            </button>
                          </li>
                        ))}
                      </ul>

                      {/* ページネーション */}
                      {pagination.totalPages > 1 && (
                        <div style={{ 
                          marginTop: '20px',
                          display: 'flex',
                          justifyContent: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}>
                          <button
                            onClick={() => handlePageChange(key, pagination.currentPage - 1)}
                            disabled={pagination.currentPage === 1}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              backgroundColor: pagination.currentPage === 1 ? '#f5f5f5' : 'white',
                              cursor: pagination.currentPage === 1 ? 'not-allowed' : 'pointer',
                            }}
                          >
                            ← 前へ
                          </button>
                          
                          {(() => {
                            const currentPage = pagination.currentPage;
                            const totalPages = pagination.totalPages;
                            const pagesToShow: number[] = [];
                            
                            // 常に最初のページを表示
                            pagesToShow.push(1);
                            
                            // 現在ページ周辺のページを追加
                            for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
                              pagesToShow.push(i);
                            }
                            
                            // 最後のページを追加（複数ページある場合）
                            if (totalPages > 1) {
                              pagesToShow.push(totalPages);
                            }
                            
                            // 重複を削除してソート
                            const uniquePages = Array.from(new Set(pagesToShow)).sort((a, b) => a - b);
                            
                            return uniquePages.map((page, idx) => {
                              const prevPage = uniquePages[idx - 1];
                              const showEllipsis = prevPage && page - prevPage > 1;
                              
                              return (
                                <React.Fragment key={page}>
                                  {showEllipsis && <span style={{ padding: '8px 4px' }}>...</span>}
                                  <button
                                    onClick={() => handlePageChange(key, page)}
                                    style={{
                                      padding: '8px 12px',
                                      border: '1px solid #ddd',
                                      borderRadius: '4px',
                                      backgroundColor: pagination.currentPage === page ? '#007bff' : 'white',
                                      color: pagination.currentPage === page ? 'white' : 'black',
                                      cursor: 'pointer',
                                      fontWeight: pagination.currentPage === page ? 'bold' : 'normal',
                                    }}
                                  >
                                    {page}
                                  </button>
                                </React.Fragment>
                              );
                            });
                          })()}
                          
                          <button
                            onClick={() => handlePageChange(key, pagination.currentPage + 1)}
                            disabled={pagination.currentPage === pagination.totalPages}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              backgroundColor: pagination.currentPage === pagination.totalPages ? '#f5f5f5' : 'white',
                              cursor: pagination.currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                            }}
                          >
                            次へ →
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                      {texts.settings.noAsset}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default Settings;
