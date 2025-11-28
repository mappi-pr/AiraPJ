import path from 'path';

// アップロードディレクトリのベースパス
// 環境変数で指定されている場合はそれを使用、そうでなければ__dirnameベースで設定
// 本番環境では UPLOADS_DIR を設定することを推奨
export const getUploadsBasePath = (): string => {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }
  // __dirname は dist/config/ または api/config/ になる
  // uploads は dist/uploads/ または api/uploads/ に配置
  return path.resolve(__dirname, '..', 'uploads');
};
