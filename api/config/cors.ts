import type { CorsOptions } from 'cors';

// CORS の許可オリジン（Issue #148）。
// 環境変数 CORS_ORIGINS（カンマ区切り）が設定されている場合のみ、そのオリジンだけを許可する。
// 未設定の場合は現行どおり全オリジンを許可する（開発・検証環境を壊さないため）。
// 本番環境ではフロントのオリジンを CORS_ORIGINS に登録して絞ること。
const origins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin.length > 0);

// 本番環境（NODE_ENV=production）で CORS_ORIGINS が未設定だと全オリジン許可のままに
// なるため、起動時に警告する。起動自体は止めない。
// このモジュールは api/index.ts から起動時に1回だけ読み込まれるので、警告も1回だけ出る。
if (origins.length === 0 && process.env.NODE_ENV === 'production') {
  console.warn(
    '警告: CORS_ORIGINS が未設定のため全オリジンを許可しています。本番環境ではフロントのオリジンを CORS_ORIGINS に設定することを推奨します。'
  );
}

export const corsOptions: CorsOptions = origins.length > 0 ? { origin: origins } : {};
