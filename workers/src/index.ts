import { Hono } from 'hono';
import { verifyGoogleToken, getUserRole, type Env, type AuthenticatedUser } from './auth';
import backgrounds from './routes/backgrounds';

type Vars = { Bindings: Env; Variables: { user: AuthenticatedUser } };

const app = new Hono<Vars>();

// POST /api/auth/verify — 現行 api/routes/auth.ts と同じ応答形式
app.post('/api/auth/verify', async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as { token?: string };
    const token = body.token;
    if (!token) return c.json({ error: 'Token is required' }, 400);

    const payload = await verifyGoogleToken(c.env, token);
    if (!payload || !payload.email) return c.json({ error: 'Invalid token' }, 401);

    const role = await getUserRole(c.env, payload.email);
    return c.json({
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      role,
      isSystemAdmin: role === 'system_admin',
      isGameMaster: role === 'game_master',
      isAdmin: role === 'system_admin' || role === 'game_master',
    });
  } catch (error) {
    console.error('Auth verify error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.route('/api/background', backgrounds);

export default app;
