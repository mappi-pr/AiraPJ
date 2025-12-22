import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from '../hooks/useTranslation';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';
import { useAuth } from '../context/AuthContext';

const ITEMS_PER_PAGE = 12;

interface GameMaster {
  id: number;
  email: string;
  name: string | null;
  createdAt: string;
  createdBy: string | null;
}

const Settings: React.FC = () => {
  const [result, setResult] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [assets, setAssets] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [gameMasters, setGameMasters] = useState<GameMaster[]>([]);
  const [newGMEmail, setNewGMEmail] = useState('');
  const [newGMName, setNewGMName] = useState('');
  const assetTypeRef = useRef<HTMLSelectElement>(null);
  const assetNameRef = useRef<HTMLInputElement>(null);
  const assetFileRef = useRef<HTMLInputElement>(null);
  const { playClick, playSuccess } = useSound();
  const { t } = useTranslation();
  const { isSystemAdmin } = useAuth();

  // アップロード種別ごとのエンドポイント
  const uploadUrls: Record<string, string> = {
    face: '/api/face/upload',
    frontHair: '/api/front-hair/upload',
    backHair: '/api/back-hair/upload',
    background: '/api/background/upload',
    costume: '/api/costume/upload',
  };

  // useMemoで最適化：tが変わったときのみ再計算
  const assetTypes = useMemo(() => [
    { key: 'face', label: t.settings.faceLabel },
    { key: 'frontHair', label: t.settings.frontHairLabel },
    { key: 'backHair', label: t.settings.backHairLabel },
    { key: 'background', label: t.settings.backgroundLabel },
    { key: 'costume', label: t.settings.costumeLabel },
  ], [t]);

  // セクション展開時のみアセットを取得
  const fetchAssetsForType = async (type: string, forceRefresh = false) => {
    if (!forceRefresh && assets[type] && assets[type].length > 0) return; // 既にロード済み
    
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
    await fetchAssetsForType(type, true);
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
      setResult(t.settings.pngOnly);
      return;
    }
    if (!type || !uploadUrls[type]) {
      setResult(t.settings.selectType);
      return;
    }
    const formData = new FormData();
    formData.append('name', name || '');
    formData.append('asset', file);
    const url = uploadUrls[type];
    setUploading(true);
    try {
      const res = await axios.post(url, formData);
      const data = res.data;
      // パーツ・背景・衣装いずれかのレスポンスに対応
      const assetPath = data.assetPath || data.face?.assetPath || data.frontHair?.assetPath || data.backHair?.assetPath || data.background?.assetPath || data.costume?.assetPath;
      const id = data.id || data.face?.id || data.frontHair?.id || data.backHair?.id || data.background?.id || data.costume?.id;
      if (assetPath && id) {
        playSuccess();
        setResult(
          `${t.settings.resultSuccess}\nID: ${id}\n${t.settings.resultImage} <img src="${assetPath}" width="100" />`
        );
        // アップロード後、該当タイプのアセットリストを再取得
        if (type) {
          await refreshAssetsForType(type);
        }
      } else {
        setResult(data.error || t.settings.resultFail);
      }
    } catch {
      setResult(t.settings.resultFail);
    } finally {
      setUploading(false);
    }
  };

  // 削除
  const handleDelete = async (type: string, id: number) => {
    if (!window.confirm(t.settings.deleteConfirm)) return;
    playClick();
    try {
      await axios.delete(`${uploadUrls[type].replace('/upload', '')}/${id}`);
      // 削除後、該当タイプのアセットリストを再取得
      await refreshAssetsForType(type);
      setResult(t.settings.deleteSuccess);
    } catch {
      setResult(t.settings.deleteFail);
    }
  };

  // 並び替え
  const handleReorder = async (type: string, id: number, direction: 'up' | 'down') => {
    playClick();
    try {
      await axios.put(`${uploadUrls[type].replace('/upload', '')}/${id}/order`, { direction });
      await refreshAssetsForType(type);
      setResult(t.settings.sortOrderUpdateSuccess);
    } catch {
      setResult(t.settings.sortOrderUpdateFail);
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

  // ゲームマスター一覧を取得
  const fetchGameMasters = async () => {
    if (!isSystemAdmin) return;
    
    try {
      const res = await axios.get('/api/game-masters');
      setGameMasters(res.data);
    } catch (error) {
      console.error('Error fetching game masters:', error);
      setResult('ゲームマスターの取得に失敗しました');
    }
  };

  // ゲームマスターを追加
  const handleAddGameMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    
    if (!newGMEmail) {
      setResult('メールアドレスを入力してください');
      return;
    }

    try {
      await axios.post('/api/game-masters', {
        email: newGMEmail,
        name: newGMName || null,
      });
      
      playSuccess();
      setResult('ゲームマスターを追加しました');
      setNewGMEmail('');
      setNewGMName('');
      await fetchGameMasters();
    } catch (error: any) {
      console.error('Error adding game master:', error);
      if (error.response?.status === 409) {
        setResult('このユーザーは既にゲームマスターです');
      } else {
        setResult('ゲームマスターの追加に失敗しました');
      }
    }
  };

  // ゲームマスターを削除
  const handleRemoveGameMaster = async (id: number, email: string) => {
    playClick();
    
    if (!window.confirm(`${email} をゲームマスターから削除しますか？`)) {
      return;
    }

    try {
      await axios.delete(`/api/game-masters/${id}`);
      playSuccess();
      setResult('ゲームマスターを削除しました');
      await fetchGameMasters();
    } catch (error) {
      console.error('Error removing game master:', error);
      setResult('ゲームマスターの削除に失敗しました');
    }
  };

  // 初回マウント時にゲームマスター一覧を取得
  useEffect(() => {
    if (isSystemAdmin) {
      fetchGameMasters();
    }
    // eslint-disable-next-line
  }, [isSystemAdmin]);

  return (
    <PageTransition>
      <SparkleEffect />
      <div className="main-container">
        <h1>{t.settings.title}</h1>
        <nav>
          <Link to="/title" onClick={playClick}>{t.common.backToTitle}</Link>
        </nav>

        {/* ゲームマスター管理（システム管理者専用） */}
        {isSystemAdmin && (
          <>
            <h2 style={{ marginTop: '32px', color: '#FF6B6B' }}>🔑 ゲームマスター管理（システム管理者専用）</h2>
            <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <h3>ゲームマスターを追加</h3>
              <form onSubmit={handleAddGameMaster} style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <label>
                    メールアドレス: 
                    <input
                      type="email"
                      value={newGMEmail}
                      onChange={(e) => setNewGMEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                      style={{ marginLeft: '8px', width: '300px' }}
                    />
                  </label>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label>
                    名前（任意）: 
                    <input
                      type="text"
                      value={newGMName}
                      onChange={(e) => setNewGMName(e.target.value)}
                      placeholder="表示名"
                      style={{ marginLeft: '8px', width: '300px' }}
                    />
                  </label>
                </div>
                <button type="submit" style={{ background: '#4CAF50', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  追加
                </button>
              </form>

              <h3>現在のゲームマスター一覧</h3>
              {gameMasters.length === 0 ? (
                <p>登録されているゲームマスターはいません</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>メールアドレス</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>名前</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>登録日時</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>登録者</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameMasters.map((gm) => (
                      <tr key={gm.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px' }}>{gm.email}</td>
                        <td style={{ padding: '8px' }}>{gm.name || '-'}</td>
                        <td style={{ padding: '8px' }}>{new Date(gm.createdAt).toLocaleString('ja-JP')}</td>
                        <td style={{ padding: '8px' }}>{gm.createdBy || '-'}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveGameMaster(gm.id, gm.email)}
                            style={{ background: '#f44336', color: 'white', padding: '4px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        <h2>{t.settings.uploadTitle}</h2>
        <form id="uploadForm" onSubmit={handleUpload} encType="multipart/form-data">
          <label>
            {t.settings.typeLabel}
            <select name="type" ref={assetTypeRef}>
              {assetTypes.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <br />
          <label>
            {t.settings.nameLabel} <input type="text" name="name" ref={assetNameRef} required />
          </label>
          <br />
          <input type="file" name="asset" ref={assetFileRef} accept="image/png" required />
          <br />
          <button type="submit" disabled={uploading}>
            {uploading ? t.settings.uploadingBtn : t.settings.uploadBtn}
          </button>
        </form>
        <div id="uploadResult" dangerouslySetInnerHTML={{ __html: result }} />

        <h2>{t.settings.assetListTitle}</h2>
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
                      {t.common.loading}
                    </div>
                  ) : assets[key] && assets[key].length > 0 ? (
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
                          {pagination?.totalItems || 0}件中 {pagination && pagination.totalItems > 0 ? Math.min((pagination.currentPage - 1) * ITEMS_PER_PAGE + 1, pagination.totalItems) : 0}-
                          {pagination ? Math.min(pagination.currentPage * ITEMS_PER_PAGE, pagination.totalItems) : 0}件を表示
                        </span>
                      </div>

                      {pagination && pagination.totalItems > 0 ? (
                        <>
                          {/* アセットリスト */}
                          <ul className="asset-list" style={{ 
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '16px',
                        listStyle: 'none',
                        padding: 0,
                      }}>
                        {(() => {
                          // Get the full filtered list once for all items
                          const fullList = getFilteredAssets(key);
                          
                          return (
                            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                            pagination.items.map((item: any, _index: number) => {
                              // Get the original index in the full filtered list
                              const originalIndex = fullList.findIndex(a => a.id === item.id);
                              
                              return (
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
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleReorder(key, item.id, 'up')}
                                  disabled={originalIndex === 0}
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: originalIndex === 0 ? '#ccc' : '#007bff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: originalIndex === 0 ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                  }}
                                  title={originalIndex === 0 ? '' : t.settings.moveUpTooltip}
                                >
                                  {t.settings.moveUpBtn}
                                </button>
                                <button
                                  onClick={() => handleReorder(key, item.id, 'down')}
                                  disabled={originalIndex === fullList.length - 1}
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: originalIndex === fullList.length - 1 ? '#ccc' : '#007bff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: originalIndex === fullList.length - 1 ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                  }}
                                  title={originalIndex === fullList.length - 1 ? '' : t.settings.moveDownTooltip}
                                >
                                  {t.settings.moveDownBtn}
                                </button>
                                <button 
                                  onClick={() => handleDelete(key, item.id)}
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#dc3545',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                  }}
                                  title={t.settings.deleteTooltip}
                                >
                                  {t.settings.deleteBtn}
                                </button>
                              </div>
                            </li>
                          );
                        })
                          );
                        })()}
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
                          {t.settings.noSearchResults}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                      {t.settings.noAsset}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
    </PageTransition>
  );
};

export default Settings;
