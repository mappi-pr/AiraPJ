// 現行 api/middleware/auth.ts の Workers 版スパイク。
// google-auth-library は Workers で使えない前提で、Google の JWKS を fetch して
// WebCrypto で RS256 署名を検証する方式に置き換える。
// GOOGLE_JWKS_URL はテスト時に差し替え可能にするための環境変数（既定は Google の実 URL）。

export interface Env {
  DB: D1Database;
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

// JWKS の簡易キャッシュ（同一 isolate 内で再利用する。現行の google-auth-library も証明書をキャッシュする）
let jwksCache: { fetchedAt: number; keys: JsonWebKey[] } | null = null;
const JWKS_TTL_MS = 5 * 60 * 1000;

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlToJson(input: string): Record<string, unknown> {
  const bytes = base64UrlToBytes(input);
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function fetchJwks(env: Env): Promise<JsonWebKey[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const url = env.GOOGLE_JWKS_URL || DEFAULT_JWKS_URL;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`);
  const body = (await res.json()) as { keys: JsonWebKey[] };
  jwksCache = { fetchedAt: Date.now(), keys: body.keys };
  return body.keys;
}

// Google ID トークンを検証し、ペイロードを取得（現行 verifyGoogleToken 相当）
export async function verifyGoogleToken(env: Env, token: string): Promise<GooglePayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const header = base64UrlToJson(headerB64) as { alg?: string; kid?: string };
    if (header.alg !== 'RS256' || !header.kid) return null;

    const keys = await fetchJwks(env);
    const jwk = keys.find((k) => (k as { kid?: string }).kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const signed = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlToBytes(signatureB64);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, signed);
    if (!valid) return null;

    const payload = base64UrlToJson(payloadB64) as GooglePayload & {
      iss?: string;
      aud?: string;
      exp?: number;
    };

    // google-auth-library の verifyIdToken が行う検証のうち、aud / iss / exp を明示的に再現する
    if (payload.aud !== env.GOOGLE_CLIENT_ID) return null;
    if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') return null;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null;

    return payload;
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
