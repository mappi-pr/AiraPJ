import { Hono } from 'hono';
import type { Env, AuthenticatedUser } from '../auth';

// 現行 api/routes/generation-history.ts の Workers(D1) 版。
// 履歴の読み書きに認証は不要（現行どおり）。レスポンス形状・エラー文言は現行に一致させる。
// stickers は D1 では JSON 文字列として保存し、応答時にパースして返す（現行 Sequelize の
// JSON カラムがパース済み配列を返すのと同じ形にする）。

type Vars = { Bindings: Env; Variables: { user: AuthenticatedUser } };

interface HistoryRow {
  id: number;
  userId: string;
  backgroundId: number | null;
  costumeId: number | null;
  backHairId: number | null;
  faceId: number | null;
  frontHairId: number | null;
  scale: number;
  dragX: number;
  dragY: number;
  stickers: string | null;
  imageUrl: string | null;
  createdAt: string;
}

function historyToJson(row: HistoryRow) {
  return {
    id: row.id,
    userId: row.userId,
    backgroundId: row.backgroundId,
    costumeId: row.costumeId,
    backHairId: row.backHairId,
    faceId: row.faceId,
    frontHairId: row.frontHairId,
    scale: row.scale,
    dragX: row.dragX,
    dragY: row.dragY,
    stickers: row.stickers === null ? null : (JSON.parse(row.stickers) as unknown),
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
  };
}

// POST で受け取ったステッカー配置を検証し、保存形式に正規化する（現行 #165/#168 と同一）。
// 未指定（undefined / null）は「配置なし」として null を返す。
// 形式が不正な場合は null と区別するため例外を投げ、呼び出し側で 400 にする。
const MAX_STICKER_PLACEMENTS = 100;

interface StickerPlacement {
  stickerId: number;
  x: number;
  y: number;
}

function normalizeStickerPlacements(input: unknown): StickerPlacement[] | null {
  if (input === undefined || input === null) return null;
  if (!Array.isArray(input) || input.length > MAX_STICKER_PLACEMENTS) {
    throw new Error('Invalid stickers');
  }
  return input.map((item) => {
    if (typeof item !== 'object' || item === null) throw new Error('Invalid stickers');
    const { stickerId, x, y } = item as { stickerId?: unknown; x?: unknown; y?: unknown };
    if (typeof stickerId !== 'number' || !Number.isInteger(stickerId) || stickerId <= 0) {
      throw new Error('Invalid stickers');
    }
    if (typeof x !== 'number' || !Number.isFinite(x) || typeof y !== 'number' || !Number.isFinite(y)) {
      throw new Error('Invalid stickers');
    }
    return { stickerId, x, y };
  });
}

// 履歴が参照するパーツがすべて現存する（論理削除されていない）かを一括で判定する（現行 #163 と同じ方式）。
// 履歴件数によらず、リソースごとに IN 句で1回ずつ照会する（最大5クエリ）。
// ステッカー配置は可用性に含めない（現行どおり。削除済みステッカーは復元時にフロントがスキップする）。
const PART_REFS = [
  { key: 'backgroundId', table: 'backgrounds' },
  { key: 'costumeId', table: 'costumes' },
  { key: 'backHairId', table: 'back_hairs' },
  { key: 'faceId', table: 'faces' },
  { key: 'frontHairId', table: 'front_hairs' },
] as const;

type PartRefKey = (typeof PART_REFS)[number]['key'];

async function computeAvailability(db: D1Database, histories: HistoryRow[]): Promise<boolean[]> {
  const aliveSets = await Promise.all(
    PART_REFS.map(async ({ key, table }) => {
      const ids = [...new Set(histories.map((h) => h[key]).filter((id): id is number => id != null))];
      if (ids.length === 0) return new Set<number>();
      const placeholders = ids.map(() => '?').join(', ');
      const { results } = await db
        .prepare(`SELECT id FROM ${table} WHERE deleted = 0 AND id IN (${placeholders})`)
        .bind(...ids)
        .all<{ id: number }>();
      return new Set(results.map((row) => row.id));
    })
  );
  return histories.map((h) =>
    PART_REFS.every(({ key }, i) => {
      const id: number | null = h[key as PartRefKey];
      return id == null || aliveSets[i].has(id);
    })
  );
}

async function ensureUser(db: D1Database, userId: string): Promise<void> {
  // 現行 User.findOrCreate 相当
  await db.prepare('INSERT OR IGNORE INTO users (id) VALUES (?)').bind(userId).run();
}

const app = new Hono<Vars>();

// GET /api/generation-history?userId=xxx
app.get('/', async (c) => {
  try {
    const userId = c.req.query('userId');
    if (!userId) return c.json({ error: 'userId required' }, 400);

    await ensureUser(c.env.DB, userId);

    const { results } = await c.env.DB.prepare(
      'SELECT * FROM generation_histories WHERE userId = ? ORDER BY createdAt DESC LIMIT 100'
    )
      .bind(userId)
      .all<HistoryRow>();

    const availability = await computeAvailability(c.env.DB, results);

    return c.json(results.map((history, i) => ({ ...historyToJson(history), isAvailable: availability[i] })));
  } catch (error) {
    console.error('Error fetching generation history:', error);
    return c.json({ error: 'Failed to fetch generation history' }, 500);
  }
});

// POST /api/generation-history
app.post('/', async (c) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const userId = body.userId as string | undefined;

    if (!userId) return c.json({ error: 'userId required' }, 400);

    let stickerPlacements: StickerPlacement[] | null;
    try {
      stickerPlacements = normalizeStickerPlacements(body.stickers);
    } catch {
      return c.json({ error: 'Invalid stickers' }, 400);
    }

    await ensureUser(c.env.DB, userId);

    // 現行は各 ID を `value || null`、scale を `scale || 1.0`、dragX/dragY を `|| 0` で
    // 既定値に寄せている（falsy はすべて既定値）。その意味論をそのまま再現する。
    const row = await c.env.DB.prepare(
      `INSERT INTO generation_histories
         (userId, backgroundId, costumeId, backHairId, faceId, frontHairId, scale, dragX, dragY, imageUrl, stickers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
      .bind(
        userId,
        (body.backgroundId as number | null) || null,
        (body.costumeId as number | null) || null,
        (body.backHairId as number | null) || null,
        (body.faceId as number | null) || null,
        (body.frontHairId as number | null) || null,
        (body.scale as number | undefined) || 1.0,
        (body.dragX as number | undefined) || 0,
        (body.dragY as number | undefined) || 0,
        (body.imageUrl as string | null) || null,
        stickerPlacements === null ? null : JSON.stringify(stickerPlacements)
      )
      .first<HistoryRow>();

    return c.json(historyToJson(row!));
  } catch (error) {
    console.error('Error creating generation history:', error);
    return c.json({ error: 'Failed to create generation history' }, 500);
  }
});

// DELETE /api/generation-history/:id?userId=xxx
app.delete('/:id', async (c) => {
  try {
    const userId = c.req.query('userId');
    if (!userId) return c.json({ error: 'userId required' }, 400);

    // 現行どおり、対象が存在しなくても success を返す（where は id + userId）
    await c.env.DB.prepare('DELETE FROM generation_histories WHERE id = ? AND userId = ?')
      .bind(c.req.param('id'), userId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting generation history:', error);
    return c.json({ error: 'Failed to delete generation history' }, 500);
  }
});

export default app;
