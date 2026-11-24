import { Hono } from 'hono';
import { verifyGoogleToken, getUserRole, type Env, type AuthenticatedUser } from './auth';
import backgrounds from './routes/backgrounds';
import backgroundUpload from './routes/background-upload';
import { serveUpload } from './routes/uploads';

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
app.route('/api/background', backgroundUpload);

// GET /uploads/* — R2 から画像を配信（現行 express.static 相当、assetPath 互換の要）
app.get('/uploads/*', serveUpload);

export default app;
