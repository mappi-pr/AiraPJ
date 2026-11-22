import { Request, Response, NextFunction } from 'express';

// 管理画面（管理者向け機能）全体の有効/無効を環境変数 ADMIN_ENABLED で制御する。
// 未設定の場合は有効（従来どおり）。'false' または '0' の場合のみ無効になる。
export function isAdminEnabled(): boolean {
  const value = process.env.ADMIN_ENABLED;
  return value !== 'false' && value !== '0';
}

// 管理者向けエンドポイントの入口で使うミドルウェア。
// 管理画面が無効な場合は、エンドポイント自体が存在しないものとして 404 を返す。
export function requireAdminEnabled(req: Request, res: Response, next: NextFunction) {
  if (!isAdminEnabled()) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  next();
}
