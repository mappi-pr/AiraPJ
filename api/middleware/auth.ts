import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { fn, col, where as sqlWhere } from 'sequelize';
import { GameMaster } from '../models/gameMaster';

export interface AuthenticatedUser {
  email: string;
  name?: string;
  picture?: string;
  role: 'system_admin' | 'game_master' | 'user';
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  console.warn('WARNING: GOOGLE_CLIENT_ID environment variable is not set. Authentication will fail.');
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// システム管理者メールアドレスのホワイトリスト（最強権限）
// メールアドレスは大文字小文字を区別しないため、登録側・照合側とも小文字化して比較する（Issue #148）
const SYSTEM_ADMIN_EMAILS = (process.env.SYSTEM_ADMIN_EMAILS || '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(email => email.length > 0);

// Google IDトークンを検証し、ペイロードを取得
export async function verifyGoogleToken(token: string) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// メールアドレスがシステム管理者リストに含まれているかチェック（大文字小文字を区別しない）
export function isSystemAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return SYSTEM_ADMIN_EMAILS.includes(email.toLowerCase());
}

// メールアドレスがゲームマスターかチェック（データベースから確認、大文字小文字を区別しない）
export async function isGameMaster(email: string | undefined): Promise<boolean> {
  if (!email) return false;

  try {
    const gameMaster = await GameMaster.findOne({
      where: sqlWhere(fn('LOWER', col('email')), email.toLowerCase()),
    });
    return gameMaster !== null;
  } catch (error) {
    console.error('Error checking game master status:', error);
    return false;
  }
}

// ユーザーの役割を取得（システム管理者 > ゲームマスター > 一般ユーザー）
export async function getUserRole(email: string | undefined): Promise<'system_admin' | 'game_master' | 'user'> {
  if (!email) return 'user';
  
  if (isSystemAdmin(email)) {
    return 'system_admin';
  }
  
  if (await isGameMaster(email)) {
    return 'game_master';
  }
  
  return 'user';
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

  // ユーザーの役割を取得
  const role = await getUserRole(payload.email);

  // リクエストオブジェクトにユーザー情報を追加
  req.user = {
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    role: role,
  };

  next();
}

// システム管理者チェックミドルウェア: 認証済みユーザーがシステム管理者かチェック
export function requireSystemAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user;

  if (!user || user.role !== 'system_admin') {
    res.status(403).json({ error: 'Forbidden: System admin access required' });
    return;
  }

  next();
}

// 管理者チェックミドルウェア: 認証済みユーザーがシステム管理者またはゲームマスターかチェック
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user;

  if (!user || (user.role !== 'system_admin' && user.role !== 'game_master')) {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }

  next();
}

// 後方互換性のため、isAdminも残す（システム管理者またはゲームマスター）
export async function isAdmin(email: string | undefined): Promise<boolean> {
  const role = await getUserRole(email);
  return role === 'system_admin' || role === 'game_master';
}
