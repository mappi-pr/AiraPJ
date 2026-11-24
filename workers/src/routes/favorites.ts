import { Hono } from 'hono';
import type { Env, AuthenticatedUser } from '../auth';

// 現行 api/routes/favorite.ts の Workers(D1) 版。
// 履歴と同じく認証不要の公開 API（現行どおり）。レスポンス形状・エラー文言は現行に一致させる。
// 現行との違いとして意図的に残した点:
// - 生成履歴と違い、現行 favorite は User.findOrCreate を行わないため、users への登録はしない
// - (userId, costumeId) の一意制約は現行にも無いため、重複登録もそのまま通す
// - モデルが timestamps: false のため、createdAt / updatedAt は返らない

type Vars = { Bindings: Env; Variables: { user: AuthenticatedUser } };

interface FavoriteRow {
  id: number;
  userId: string;
  costumeId: number;
}

function favoriteToJson(row: FavoriteRow) {
  return { id: row.id, userId: row.userId, costumeId: row.costumeId };
}

const app = new Hono<Vars>();

// GET /api/favorite?userId=xxx
app.get('/', async (c) => {
  try {
    const userId = c.req.query('userId');
    if (!userId) return c.json({ error: 'userId required' }, 400);

    // 現行 findAll は ORDER BY を指定していない（暗黙の挿入順）。
    // userId インデックス経由の走査でも行 id 順になるため、実質の並びは現行と一致する。
    const { results } = await c.env.DB.prepare('SELECT * FROM favorites WHERE userId = ?')
      .bind(userId)
      .all<FavoriteRow>();

    return c.json(results.map(favoriteToJson));
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return c.json({ error: 'Failed to fetch favorites' }, 500);
  }
});

// POST /api/favorite
app.post('/', async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = body.userId as string | undefined;
    const costumeId = body.costumeId as number | undefined;

    // 現行は falsy チェック（costumeId = 0 も「未指定」扱いで 400）。その意味論を再現する。
    if (!userId || !costumeId) return c.json({ error: 'userId and costumeId required' }, 400);

    const row = await c.env.DB.prepare(
      'INSERT INTO favorites (userId, costumeId) VALUES (?, ?) RETURNING *'
    )
      .bind(userId, costumeId)
      .first<FavoriteRow>();

    return c.json(favoriteToJson(row!));
  } catch (error) {
    console.error('Error creating favorite:', error);
    return c.json({ error: 'Failed to create favorite' }, 500);
  }
});

// DELETE /api/favorite/:id?userId=xxx
app.delete('/:id', async (c) => {
  try {
    const userId = c.req.query('userId');
    if (!userId) return c.json({ error: 'userId required' }, 400);

    // 現行どおり、対象が存在しなくても success を返す（where は id + userId）
    await c.env.DB.prepare('DELETE FROM favorites WHERE id = ? AND userId = ?')
      .bind(c.req.param('id'), userId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    return c.json({ error: 'Failed to delete favorite' }, 500);
  }
});

export default app;
