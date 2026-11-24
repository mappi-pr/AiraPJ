import { Hono } from 'hono';
import type { Env, AuthenticatedUser } from '../auth';
import { requireAdminEnabled, authenticate, requireAdmin } from '../middleware';

// 現行 api/routes/background.ts の Workers(D1) 版スパイク。
// 作成は現行では /api/background/upload（multer でファイルをディスク保存してから作成）のみ。
// ここではレコード作成の意味論（バリデーション・sortOrder 採番）を JSON POST で再現し、
// ファイル実体つきの作成は background-upload.ts（R2 保存）で検証する。

type Vars = { Bindings: Env; Variables: { user: AuthenticatedUser } };

export interface BackgroundRow {
  id: number;
  name: string;
  assetPath: string;
  deleted: number;
  deletedAt: string | null;
  sortOrder: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

// Sequelize の JSON 表現に合わせる（deleted は boolean、deletedAt は ISO 文字列か null）
export function toJson(row: BackgroundRow) {
  return {
    id: row.id,
    name: row.name,
    assetPath: row.assetPath,
    deleted: row.deleted === 1,
    deletedAt: row.deletedAt,
    sortOrder: row.sortOrder,
    offsetX: row.offsetX,
    offsetY: row.offsetY,
    width: row.width,
    height: row.height,
  };
}

async function findByPk(db: D1Database, id: string): Promise<BackgroundRow | null> {
  return db.prepare('SELECT * FROM backgrounds WHERE id = ?').bind(id).first<BackgroundRow>();
}

export interface NewBackground {
  name: string;
  assetPath: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

// sortOrder の採番と INSERT を単一文で行う（#166 ちゃっぴー監査対応）。
// 以前は SELECT MAX(sortOrder) → 別文 INSERT の2段構えで、同時作成が両方とも同じ max+1 を
// 計算して sortOrder が重複し得た。INSERT ... SELECT なら採番と挿入が1文で原子的に進む。
// それでも一意制約（部分インデックス idx_backgrounds_sort_order_active）に当たった場合は
// 1回だけ再試行する。再試行側は改めて MAX を計算し直すため、競合相手が先に作った分だけ進んだ値になる。
export async function insertBackground(db: D1Database, input: NewBackground): Promise<BackgroundRow> {
  const attempt = () =>
    db
      .prepare(
        `INSERT INTO backgrounds (name, assetPath, sortOrder, offsetX, offsetY, width, height)
         SELECT ?, ?, COALESCE(MAX(sortOrder), 0) + 1, ?, ?, ?, ?
         FROM backgrounds WHERE deleted = 0
         RETURNING *`
      )
      .bind(input.name, input.assetPath, input.offsetX, input.offsetY, input.width, input.height)
      .first<BackgroundRow>();
  try {
    return (await attempt())!;
  } catch (e) {
    if (!/UNIQUE constraint failed/i.test(e instanceof Error ? e.message : String(e))) throw e;
    console.warn('sortOrder unique conflict on background create; retrying once:', e);
    return (await attempt())!;
  }
}

const app = new Hono<Vars>();

// GET /api/background
app.get('/', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM backgrounds WHERE deleted = 0 ORDER BY sortOrder ASC, id ASC'
    ).all<BackgroundRow>();
    return c.json(results.map(toJson));
  } catch (e) {
    console.error('Error fetching backgrounds:', e);
    return c.json({ error: 'Failed to fetch backgrounds' }, 500);
  }
});

// GET /api/background/:id
app.get('/:id', async (c) => {
  try {
    const background = await findByPk(c.env.DB, c.req.param('id') as string);
    if (!background || background.deleted === 1) return c.json({ error: 'Not found' }, 404);
    return c.json(toJson(background));
  } catch (error) {
    console.error('Error fetching background:', error);
    return c.json({ error: 'Fetch failed' }, 500);
  }
});

// POST /api/background （管理者専用）— 現行 /upload のレコード作成部分の再現
app.post('/', requireAdminEnabled, authenticate, requireAdmin, async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const { name, assetPath } = body;
    if (typeof name !== 'string' || name === '' || typeof assetPath !== 'string' || assetPath === '') {
      // 現行は Sequelize の allowNull 検証で 500 になる。スパイクでは 400 にしている（差異として報告）
      return c.json({ error: 'name and assetPath are required' }, 400);
    }
    const parseOptionalInt = (value: unknown, defaultValue: number): number | null => {
      if (value === undefined || value === '') return defaultValue;
      const parsed = Number(value);
      return Number.isInteger(parsed) ? parsed : null;
    };
    const offsetX = parseOptionalInt(body.offsetX, 0);
    const offsetY = parseOptionalInt(body.offsetY, 0);
    const width = parseOptionalInt(body.width, 240);
    const height = parseOptionalInt(body.height, 320);
    if (
      offsetX === null || offsetX < -1000 || offsetX > 1000 ||
      offsetY === null || offsetY < -1000 || offsetY > 1000 ||
      width === null || width < 1 || width > 2000 ||
      height === null || height < 1 || height > 2000
    ) {
      return c.json({ error: 'Invalid position/size values' }, 400);
    }
    const inserted = await insertBackground(c.env.DB, { name, assetPath, offsetX, offsetY, width, height });
    return c.json(toJson(inserted));
  } catch (err) {
    console.error('Background create error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// DELETE /api/background/:id (管理者専用) — 論理削除＋sortOrder を詰める
app.delete('/:id', requireAdminEnabled, authenticate, requireAdmin, async (c) => {
  try {
    const background = await findByPk(c.env.DB, c.req.param('id') as string);
    if (!background || background.deleted === 1) return c.json({ error: 'Not found' }, 404);
    const deletedSortOrder = background.sortOrder;
    // 現行は sequelize.transaction。D1 には対話的トランザクションがなく、batch() の一括実行で原子性を担保する
    const statements = [
      c.env.DB.prepare('UPDATE backgrounds SET deleted = 1, deletedAt = ?, sortOrder = 0 WHERE id = ?').bind(
        new Date().toISOString(),
        background.id
      ),
    ];
    if (deletedSortOrder > 0) {
      // 詰め直しは「全行 -1」を1文でやらず、大きなオフセットを経由する2文に分ける。
      // sortOrder には有効行の一意制約（部分インデックス）があるため、-1 の一括更新は
      // 行の処理順によっては途中状態で重複と判定され得る。いったん全対象を +OFFSET の
      // 未使用レンジへ退避させてから -(OFFSET+1) で戻せば、どの行から処理されても
      // 退避先・戻し先のどちらでも既存値と重ならない。
      const COMPACT_OFFSET = 1_000_000;
      statements.push(
        c.env.DB.prepare('UPDATE backgrounds SET sortOrder = sortOrder + ? WHERE deleted = 0 AND sortOrder > ?').bind(
          COMPACT_OFFSET,
          deletedSortOrder
        ),
        c.env.DB.prepare('UPDATE backgrounds SET sortOrder = sortOrder - ? WHERE deleted = 0 AND sortOrder > ?').bind(
          COMPACT_OFFSET + 1,
          COMPACT_OFFSET
        )
      );
    }
    await c.env.DB.batch(statements);
    // 現行はコミット後に物理ファイルも消す。R2 でも同じ順序・同じ扱いにし、
    // 削除に失敗しても論理削除は成立しているため、ログに留めてレスポンスは成功とする。
    // キーは assetPath (/uploads/background/xxx.png) からプレフィックスを外して逆引きする
    const key = background.assetPath.replace(/^\/uploads\//, '');
    try {
      await c.env.UPLOADS.delete(key);
    } catch (fileError) {
      console.error('Failed to delete asset file in R2:', fileError);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting background:', error);
    return c.json({ error: 'Delete failed' }, 500);
  }
});

// PUT /api/background/:id/order (管理者専用)
app.put('/:id/order', requireAdminEnabled, authenticate, requireAdmin, async (c) => {
  try {
    const { direction } = (await c.req.json().catch(() => ({}))) as { direction?: string };
    const currentItem = await findByPk(c.env.DB, c.req.param('id') as string);
    if (!currentItem || currentItem.deleted === 1) return c.json({ error: 'Not found' }, 404);

    const { results: allItems } = await c.env.DB.prepare(
      'SELECT * FROM backgrounds WHERE deleted = 0 ORDER BY sortOrder ASC, id ASC'
    ).all<BackgroundRow>();
    const currentIndex = allItems.findIndex((item) => item.id === currentItem.id);
    if (currentIndex === -1) return c.json({ error: 'Not found' }, 404);

    let swapIndex = -1;
    if (direction === 'up' && currentIndex > 0) swapIndex = currentIndex - 1;
    else if (direction === 'down' && currentIndex < allItems.length - 1) swapIndex = currentIndex + 1;
    if (swapIndex === -1) return c.json({ success: true, message: 'Already at edge' });

    const swapItem = allItems[swapIndex];
    // sortOrder の交換は一時値 0 を経由する3文にする。有効行の一意制約（部分インデックス）があるため、
    // 2文で直接入れ替えると1文目で相手の値と重複して制約に当たる。有効行の sortOrder は 1 以上で
    // 0 は未使用なので、まず自分を 0 へ退避させ、相手に自分の旧値を渡し、最後に相手の旧値を受け取る。
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE backgrounds SET sortOrder = 0 WHERE id = ?').bind(currentItem.id),
      c.env.DB.prepare('UPDATE backgrounds SET sortOrder = ? WHERE id = ?').bind(currentItem.sortOrder, swapItem.id),
      c.env.DB.prepare('UPDATE backgrounds SET sortOrder = ? WHERE id = ?').bind(swapItem.sortOrder, currentItem.id),
    ]);
    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating background order:', error);
    return c.json({ error: 'Order update failed' }, 500);
  }
});

// PUT /api/background/:id (管理者専用) — 名前・位置・サイズの更新
app.put('/:id', requireAdminEnabled, authenticate, requireAdmin, async (c) => {
  try {
    const background = await findByPk(c.env.DB, c.req.param('id') as string);
    if (!background || background.deleted === 1) return c.json({ error: 'Not found' }, 404);

    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const updates: Record<string, string | number> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return c.json({ error: 'Invalid name value' }, 400);
      }
      updates.name = body.name;
    }
    const numericFields: { key: 'offsetX' | 'offsetY' | 'width' | 'height'; min: number; max: number }[] = [
      { key: 'offsetX', min: -1000, max: 1000 },
      { key: 'offsetY', min: -1000, max: 1000 },
      { key: 'width', min: 1, max: 2000 },
      { key: 'height', min: 1, max: 2000 },
    ];
    for (const field of numericFields) {
      const value = body[field.key];
      if (value === undefined || value === '') continue;
      if (typeof value !== 'number' && typeof value !== 'string') {
        return c.json({ error: `Invalid ${field.key} value` }, 400);
      }
      const parsed = Number(value);
      if (!Number.isInteger(parsed)) return c.json({ error: `Invalid ${field.key} value` }, 400);
      if (parsed < field.min || parsed > field.max) {
        return c.json({ error: `${field.key} must be between ${field.min} and ${field.max}` }, 400);
      }
      updates[field.key] = parsed;
    }

    const keys = Object.keys(updates);
    if (keys.length > 0) {
      const setClause = keys.map((k) => `${k} = ?`).join(', ');
      await c.env.DB.prepare(`UPDATE backgrounds SET ${setClause} WHERE id = ?`)
        .bind(...keys.map((k) => updates[k]), background.id)
        .run();
    }
    const updated = await findByPk(c.env.DB, String(background.id));
    return c.json(toJson(updated!));
  } catch (e) {
    console.error('Error updating background:', e);
    return c.json({ error: 'Update failed' }, 500);
  }
});

export default app;
