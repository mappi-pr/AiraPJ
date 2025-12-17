import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import texts from '../locales/ja.json';
import { useSound } from '../utils/useSound';
import { PageTransition } from '../utils/PageTransition';
import { SparkleEffect } from '../utils/SparkleEffect';

const assetTypes = [
  { key: 'face', label: texts.settings.faceLabel },
  { key: 'frontHair', label: texts.settings.frontHairLabel },
  { key: 'backHair', label: texts.settings.backHairLabel },
  { key: 'background', label: texts.settings.backgroundLabel },
  { key: 'costume', label: texts.settings.costumeLabel },
];

const Settings: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [assets, setAssets] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const assetTypeRef = useRef<HTMLSelectElement>(null);
  const assetNameRef = useRef<HTMLInputElement>(null);
  const assetFileRef = useRef<HTMLInputElement>(null);
  const { playClick, playSuccess } = useSound();

  // アップロード種別ごとのエンドポイント
  const uploadUrls: Record<string, string> = {
    face: '/api/face/upload',
    frontHair: '/api/front-hair/upload',
    backHair: '/api/back-hair/upload',
    background: '/api/background/upload',
    costume: '/api/costume/upload',
  };

  // 一覧取得
  const fetchAssets = async () => {
    setLoading(true);
    const newAssets: Record<string, any[]> = {};
    for (const type of assetTypes) {
      try {
        const res = await axios.get(`${uploadUrls[type.key].replace('/upload', '')}`);
        newAssets[type.key] = res.data || [];
      } catch {
        newAssets[type.key] = [];
      }
    }
    setAssets(newAssets);
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line
  }, []);

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
        playSuccess();
        setResult(
          `${texts.settings.resultSuccess}\nID: ${id}\n画像: <img src="${assetPath}" width="100" />`
        );
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
    playClick();
    try {
      await axios.delete(`${uploadUrls[type].replace('/upload', '')}/${id}`);
      fetchAssets();
      setResult(texts.settings.deleteSuccess);
    } catch {
      setResult(texts.settings.deleteFail);
    }
  };

  return (
    <PageTransition>
      <SparkleEffect />
      <div className="main-container">
        <h1>{texts.settings.title}</h1>
        <nav>
          <Link to="/title" onClick={playClick}>{texts.common.backToTitle}</Link>
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
        {loading ? (
          <div>{texts.common.loading}</div>
        ) : (
          assetTypes.map(({ key, label }) => (
            <section key={key}>
              <h3>{label}</h3>
              {assets[key]?.length ? (
                <ul className="asset-list">
                  {assets[key].map((item: any) => (
                    <li key={item.id} style={{ marginBottom: 8 }}>
                      <img src={item.assetPath} alt={item.name} width={60} style={{ verticalAlign: 'middle' }} />
                      <span style={{ margin: '0 8px' }}>{item.name}</span>
                      <button onClick={() => handleDelete(key, item.id)}>{texts.settings.deleteBtn}</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div>{texts.settings.noAsset}</div>
              )}
            </section>
          ))
        )}
      </div>
    </PageTransition>
  );
};

export default Settings;
