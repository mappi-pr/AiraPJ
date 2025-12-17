import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  console.warn('WARNING: GOOGLE_CLIENT_ID environment variable is not set. Authentication will fail.');
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// 管理者メールアドレスのホワイトリスト
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(email => email.trim())
  .filter(email => email.length > 0);

// Google IDトークンを検証し、ペイロードを取得
export async function verifyGoogleToken(token: string) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// メールアドレスが管理者リストに含まれているかチェック
export function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}

// 認証ミドルウェア: Authorizationヘッダーからトークンを検証
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = await verifyGoogleToken(token);

  if (!payload || !payload.email) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }

  // リクエストオブジェクトにユーザー情報を追加
  (req as any).user = {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };

  next();
}

// 管理者チェックミドルウェア: 認証済みユーザーが管理者かチェック
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  if (!user || !isAdmin(user.email)) {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }

  next();
}
