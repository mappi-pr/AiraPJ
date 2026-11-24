// 現行 api/middleware/auth.ts の Workers 版スパイク。
// google-auth-library は Workers で使えないため、汎用 JWT ライブラリ jose で
// Google の JWKS を使って RS256 署名を検証する方式に置き換える（案A、2026-11-24 採用決定）。
// GOOGLE_JWKS_URL はテスト時に差し替え可能にするための環境変数（既定は Google の実 URL）。

import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_JWKS_URL?: string;
  SYSTEM_ADMIN_EMAILS?: string;
  ADMIN_ENABLED?: string;
}

export interface GooglePayload {
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: unknown;
}

export interface AuthenticatedUser {
  email: string;
  name?: string;
  picture?: string;
  role: 'system_admin' | 'game_master' | 'user';
}

const DEFAULT_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

// RemoteJWKSet は内部で JWKS をキャッシュし、未知の kid では再取得する。
// URL が変わった場合（テスト差し替え等）だけ作り直す。
let remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let remoteJwksUrl: string | null = null;

function getRemoteJwks(env: Env): ReturnType<typeof createRemoteJWKSet> {
  const url = env.GOOGLE_JWKS_URL || DEFAULT_JWKS_URL;
  if (!remoteJwks || remoteJwksUrl !== url) {
    remoteJwks = createRemoteJWKSet(new URL(url));
    remoteJwksUrl = url;
  }
  return remoteJwks;
}

// Google ID トークンを検証し、ペイロードを取得（現行 verifyGoogleToken 相当）
// チェック項目は google-auth-library の verifyIdToken と同一：署名（RS256 のみ）、aud、iss、exp（必須）
export async function verifyGoogleToken(env: Env, token: string): Promise<GooglePayload | null> {
  try {
    const { payload } = await jwtVerify(token, getRemoteJwks(env), {
      algorithms: ['RS256'],
      audience: env.GOOGLE_CLIENT_ID,
      issuer: ['accounts.google.com', 'https://accounts.google.com'],
      requiredClaims: ['exp'],
    });
    return payload as GooglePayload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// システム管理者判定（登録側・照合側とも小文字化。現行仕様 #148 と同じ）
export function isSystemAdmin(env: Env, email: string | undefined): boolean {
  if (!email) return false;
  const list = (env.SYSTEM_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  return list.includes(email.toLowerCase());
}

// ゲームマスター判定（DB 照合、LOWER(email) で大小文字を区別しない。現行仕様と同じ）
export async function isGameMaster(env: Env, email: string | undefined): Promise<boolean> {
  if (!email) return false;
  try {
    const row = await env.DB.prepare('SELECT id FROM game_masters WHERE LOWER(email) = ? LIMIT 1')
      .bind(email.toLowerCase())
      .first();
    return row !== null;
  } catch (error) {
    console.error('Error checking game master status:', error);
    return false;
  }
}

export async function getUserRole(
  env: Env,
  email: string | undefined
): Promise<'system_admin' | 'game_master' | 'user'> {
  if (!email) return 'user';
  if (isSystemAdmin(env, email)) return 'system_admin';
  if (await isGameMaster(env, email)) return 'game_master';
  return 'user';
}
