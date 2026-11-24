import type { Context, Next } from 'hono';
import { verifyGoogleToken, getUserRole, type AuthenticatedUser, type Env } from './auth';

// 現行 requireAdminEnabled 相当: ADMIN_ENABLED が 'false' / '0' のときだけ 404
export async function requireAdminEnabled(c: Context<{ Bindings: Env }>, next: Next) {
  const value = c.env.ADMIN_ENABLED;
  if (value === 'false' || value === '0') {
    return c.json({ error: 'Not found' }, 404);
  }
  await next();
}

// 現行 authenticate 相当: Bearer トークンを検証し、ユーザー情報を積む
export async function authenticate(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>, next: Next) {
  const authHeader = c.req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }
  const token = authHeader.substring(7);
  const payload = await verifyGoogleToken(c.env, token);
  if (!payload || !payload.email) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }
  const role = await getUserRole(c.env, payload.email);
  c.set('user', { email: payload.email, name: payload.name, picture: payload.picture, role });
  await next();
}

// 現行 requireAdmin 相当
export async function requireAdmin(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>, next: Next) {
  const user = c.get('user');
  if (!user || (user.role !== 'system_admin' && user.role !== 'game_master')) {
    return c.json({ error: 'Forbidden: Admin access required' }, 403);
  }
  await next();
}

// 現行 requireSystemAdmin 相当
export async function requireSystemAdmin(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>, next: Next) {
  const user = c.get('user');
  if (!user || user.role !== 'system_admin') {
    return c.json({ error: 'Forbidden: System admin access required' }, 403);
  }
  await next();
}
