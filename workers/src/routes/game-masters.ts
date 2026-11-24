import { Hono } from 'hono';
import { isGameMaster, type Env, type AuthenticatedUser } from '../auth';
import { requireAdminEnabled, authenticate, requireSystemAdmin } from '../middleware';

// 現行 api/routes/gameMaster.ts の Workers(D1) 版。
// 現行は /api/game-masters 全体に requireAdminEnabled（adminGate）が掛かり、
// 各ルートが authenticate + requireSystemAdmin で保護される。順序も現行どおり
// （adminGate → 認証 → システム管理者判定）にそろえる。
// レスポンス形状・エラー文言・ステータスは現行に一致させる。

type Vars = { Bindings: Env; Variables: { user: AuthenticatedUser } };

interface GameMasterRow {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
  created_by: string | null;
}

// game_masters.created_at は SQLite の datetime('now') 形式（'YYYY-MM-DD HH:MM:SS'）で
// 入るため、現行 Sequelize の JSON 表現（ISO 8601）に寄せて返す
function toIso8601(value: string): string {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}.000Z` : value;
}

function gameMasterToJson(row: GameMasterRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: toIso8601(row.created_at),
    createdBy: row.created_by,
  };
}

const app = new Hono<Vars>();

// GET /api/game-masters - ゲームマスター一覧（システム管理者専用、createdAt DESC）
app.get('/', requireAdminEnabled, authenticate, requireSystemAdmin, async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM game_masters ORDER BY created_at DESC, id DESC'
    ).all<GameMasterRow>();
    return c.json(results.map(gameMasterToJson));
  } catch (error) {
    console.error('Error fetching game masters:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /api/game-masters - ゲームマスターを追加（システム管理者専用）
app.post('/', requireAdminEnabled, authenticate, requireSystemAdmin, async (c) => {
  try {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const body = (await c.req.json().catch(() => ({}))) as { email?: unknown; name?: unknown };
    const { email, name } = body;
    if (!email) return c.json({ error: 'Email is required' }, 400);

    // メールアドレスは大文字小文字を区別しないため、小文字化して登録する（現行仕様 #148）
    const normalizedEmail = String(email).trim().toLowerCase();

    // 既に登録されているかチェック（照合も大文字小文字を区別しない）
    if (await isGameMaster(c.env, normalizedEmail)) {
      return c.json({ error: 'This user is already a game master' }, 409);
    }

    const row = await c.env.DB.prepare(
      'INSERT INTO game_masters (email, name, created_by) VALUES (?, ?, ?) RETURNING *'
    )
      .bind(normalizedEmail, (name as string | undefined) || null, user.email)
      .first<GameMasterRow>();

    return c.json(gameMasterToJson(row!), 201);
  } catch (error) {
    console.error('Error creating game master:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// DELETE /api/game-masters/:id - ゲームマスターを削除（システム管理者専用）
app.delete('/:id', requireAdminEnabled, authenticate, requireSystemAdmin, async (c) => {
  try {
    const row = await c.env.DB.prepare('SELECT * FROM game_masters WHERE id = ?')
      .bind(c.req.param('id'))
      .first<GameMasterRow>();
    if (!row) return c.json({ error: 'Game master not found' }, 404);

    await c.env.DB.prepare('DELETE FROM game_masters WHERE id = ?').bind(row.id).run();
    return c.json({ success: true, message: 'Game master removed successfully' });
  } catch (error) {
    console.error('Error deleting game master:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
