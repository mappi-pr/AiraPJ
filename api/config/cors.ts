import type { CorsOptions } from 'cors';

// CORS の許可オリジン（Issue #148）。
// 環境変数 CORS_ORIGINS（カンマ区切り）が設定されている場合のみ、そのオリジンだけを許可する。
// 未設定の場合は現行どおり全オリジンを許可する（開発・検証環境を壊さないため）。
// 本番環境ではフロントのオリジンを CORS_ORIGINS に登録して絞ること。
const origins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);

export const corsOptions: CorsOptions = origins.length > 0 ? { origin: origins } : {};
