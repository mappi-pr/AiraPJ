// 管理画面（/settings）の有効/無効をビルド時環境変数 VITE_ADMIN_ENABLED で制御する。
// 未設定の場合は有効（従来どおり）。'false' または '0' の場合のみ無効になる。
// 使い方: VITE_ADMIN_ENABLED=false npm run build
export const ADMIN_ENABLED =
  import.meta.env.VITE_ADMIN_ENABLED !== 'false' &&
  import.meta.env.VITE_ADMIN_ENABLED !== '0';
