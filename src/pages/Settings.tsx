import React, { useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from '../hooks/useTranslation';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';
import VisualPositionEditor from '../components/VisualPositionEditor';

const ITEMS_PER_PAGE = 12;

const Settings: React.FC = () => {
  const [result, setResult] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [assets, setAssets] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [currentPages, setCurrentPages] = useState<Record<string, number>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingItem, setEditingItem] = useState<{type: string, item: any} | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    offsetX: '0',
    offsetY: '0',
    width: '240',
    height: '320',
  });
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const assetTypeRef = useRef<HTMLSelectElement>(null);
  const assetNameRef = useRef<HTMLInputElement>(null);
  const assetFileRef = useRef<HTMLInputElement>(null);
  const offsetXRef = useRef<HTMLInputElement>(null);
  const offsetYRef = useRef<HTMLInputElement>(null);
  const widthRef = useRef<HTMLInputElement>(null);
  const heightRef = useRef<HTMLInputElement>(null);
  const { playClick, playSuccess } = useSound();
  const { t } = useTranslation();

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
    const offsetX = offsetXRef.current?.value;
    const offsetY = offsetYRef.current?.value;
    const width = widthRef.current?.value;
    const height = heightRef.current?.value;
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
    // Always append position/size values (backend will use defaults if not provided)
    if (offsetX !== undefined && offsetX !== '') formData.append('offsetX', offsetX);
    if (offsetY !== undefined && offsetY !== '') formData.append('offsetY', offsetY);
    if (width !== undefined && width !== '') formData.append('width', width);
    if (height !== undefined && height !== '') formData.append('height', height);
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

  // 編集開始
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditStart = (type: string, item: any) => {
    playClick();
    setEditingItem({ type, item });
    setEditForm({
      name: item.name || '',
      offsetX: String(item.offsetX ?? 0),
      offsetY: String(item.offsetY ?? 0),
      width: String(item.width ?? 240),
      height: String(item.height ?? 320),
    });
  };

  // 編集キャンセル
  const handleEditCancel = () => {
    playClick();
    setEditingItem(null);
  };

  // 編集保存
  const handleEditSave = async () => {
    if (!editingItem) return;
    playClick();
    try {
      await axios.put(`${uploadUrls[editingItem.type].replace('/upload', '')}/${editingItem.item.id}`, editForm);
      await refreshAssetsForType(editingItem.type);
      setEditingItem(null);
      setResult(t.settings.editSuccess);
      playSuccess();
    } catch {
      setResult(t.settings.editFail);
    }
  };

  // ビジュアルエディタを開く
  const handleOpenVisualEditor = () => {
    setShowVisualEditor(true);
  };

  // ビジュアルエディタを閉じる
  const handleCloseVisualEditor = () => {
    setShowVisualEditor(false);
  };

  // ビジュアルエディタで位置変更
  const handleVisualEditorPositionChange = (offsetX: number, offsetY: number) => {
    setEditForm({
      ...editForm,
      offsetX: String(offsetX),
      offsetY: String(offsetY),
    });
  };

  // ビジュアルエディタで保存
  const handleVisualEditorSave = async () => {
    setShowVisualEditor(false);
    await handleEditSave();
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
    <PageTransition>
      <SparkleEffect />
      <div className="main-container">
        <h1>{t.settings.title}</h1>
        <nav>
          <Link to="/title" onClick={playClick}>{t.common.backToTitle}</Link>
        </nav>
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
          <details style={{ margin: '12px 0' }}>
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>{t.settings.positionSizeSettings}</summary>
            <div style={{ marginLeft: '20px', marginTop: '8px' }}>
              <label>
                {t.settings.offsetX}: <input type="number" name="offsetX" ref={offsetXRef} defaultValue="0" style={{ width: '80px' }} />
              </label>
              <br />
              <label>
                {t.settings.offsetY}: <input type="number" name="offsetY" ref={offsetYRef} defaultValue="0" style={{ width: '80px' }} />
              </label>
              <br />
              <label>
                {t.settings.width}: <input type="number" name="width" ref={widthRef} defaultValue="240" style={{ width: '80px' }} />
              </label>
              <br />
              <label>
                {t.settings.height}: <input type="number" name="height" ref={heightRef} defaultValue="320" style={{ width: '80px' }} />
              </label>
              <br />
              <small style={{ color: '#666' }}>{t.settings.defaultValuesHint}</small>
            </div>
          </details>
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
                              
                              {/* 編集フォーム（展開式） */}
                              {editingItem && editingItem.type === key && editingItem.item.id === item.id ? (
                                <div style={{ 
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  padding: '12px', 
                                  backgroundColor: '#f8f9fa', 
                                  borderRadius: '4px',
                                  border: '1px solid #dee2e6',
                                }}>
                                  <div style={{ marginBottom: '8px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', fontWeight: 'bold' }}>
                                      {t.settings.nameLabel}
                                    </label>
                                    <input
                                      type="text"
                                      value={editForm.name}
                                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                      style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '4px 8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                      }}
                                    />
                                  </div>
                                  
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', fontWeight: 'bold' }}>
                                        {t.settings.offsetX}:
                                      </label>
                                      <input
                                        type="number"
                                        value={editForm.offsetX}
                                        onChange={(e) => setEditForm({ ...editForm, offsetX: e.target.value })}
                                        style={{
                                          width: '100%',
                                          boxSizing: 'border-box',
                                          padding: '4px 8px',
                                          border: '1px solid #ddd',
                                          borderRadius: '4px',
                                          fontSize: '12px',
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', fontWeight: 'bold' }}>
                                        {t.settings.offsetY}:
                                      </label>
                                      <input
                                        type="number"
                                        value={editForm.offsetY}
                                        onChange={(e) => setEditForm({ ...editForm, offsetY: e.target.value })}
                                        style={{
                                          width: '100%',
                                          boxSizing: 'border-box',
                                          padding: '4px 8px',
                                          border: '1px solid #ddd',
                                          borderRadius: '4px',
                                          fontSize: '12px',
                                        }}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', fontWeight: 'bold' }}>
                                        {t.settings.width}:
                                      </label>
                                      <input
                                        type="number"
                                        value={editForm.width}
                                        onChange={(e) => setEditForm({ ...editForm, width: e.target.value })}
                                        style={{
                                          width: '100%',
                                          boxSizing: 'border-box',
                                          padding: '4px 8px',
                                          border: '1px solid #ddd',
                                          borderRadius: '4px',
                                          fontSize: '12px',
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', fontWeight: 'bold' }}>
                                        {t.settings.height}:
                                      </label>
                                      <input
                                        type="number"
                                        value={editForm.height}
                                        onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                                        style={{
                                          width: '100%',
                                          boxSizing: 'border-box',
                                          padding: '4px 8px',
                                          border: '1px solid #ddd',
                                          borderRadius: '4px',
                                          fontSize: '12px',
                                        }}
                                      />
                                    </div>
                                  </div>
                                  
                                  <div style={{ marginBottom: '8px' }}>
                                    <button
                                      onClick={handleOpenVisualEditor}
                                      type="button"
                                      style={{
                                        width: '100%',
                                        padding: '6px 12px',
                                        backgroundColor: '#17a2b8',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      🎨 {t.settings.visualEditor}
                                    </button>
                                  </div>
                                  
                                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                    <button
                                      onClick={handleEditCancel}
                                      style={{
                                        padding: '4px 12px',
                                        backgroundColor: '#6c757d',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      {t.settings.cancelBtn}
                                    </button>
                                    <button
                                      onClick={handleEditSave}
                                      style={{
                                        padding: '4px 12px',
                                        backgroundColor: '#28a745',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                      }}
                                    >
                                      {t.settings.saveBtn}
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                              
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
                                  onClick={() => handleEditStart(key, item)}
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#28a745',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                  }}
                                  title={t.settings.editTooltip}
                                >
                                  {t.settings.editBtn}
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
      
      {/* ビジュアルエディタ */}
      {showVisualEditor && editingItem && (
        <VisualPositionEditor
          imagePath={editingItem.item.assetPath}
          initialOffsetX={parseInt(editForm.offsetX) || 0}
          initialOffsetY={parseInt(editForm.offsetY) || 0}
          initialWidth={parseInt(editForm.width) || 240}
          initialHeight={parseInt(editForm.height) || 320}
          onPositionChange={handleVisualEditorPositionChange}
          onClose={handleCloseVisualEditor}
          onSave={handleVisualEditorSave}
          t={t}
        />
      )}
    </div>
    </PageTransition>
  );
};

export default Settings;
