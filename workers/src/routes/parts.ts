import { Hono } from 'hono';
import type { Env, AuthenticatedUser } from '../auth';
import { requireAdminEnabled, authenticate, requireAdmin } from '../middleware';

// 背景と同型のパーツ種別（face / frontHair / backHair / costume / sticker）の Workers(D1) 版。
// 現行 api のモデル・ルートは種別間で完全同型で、差異は次の config に集約される:
//   - テーブル名と URL パス（frontHair は /api/front-hair、backHair は /api/back-hair）
//   - 一覧取得失敗時のエラー文言（例: 'Failed to fetch faces'）
//   - アップロード先ディレクトリ名（PR #169 で正式名称に統一済みの名前を使う）
//   - sticker だけの差異: アップロード時の name 検証（400 'Invalid name value'）と
//     ファイル名サフィックス（現行は crypto.randomBytes(6) の hex。他種別は Math.random の base36）
// 実装本体は backgrounds.ts / background-upload.ts と同じ意味論（単一文採番＋制約競合時の
// 1回再試行、詰め直しはオフセット経由、並び替えは一時値 0 経由）を種別非依存に一般化したもの。

type Vars = { Bindings: Env; Variables: { user: AuthenticatedUser } };

export interface PartRow {
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

export interface PartConfig {
  table: string;
  path: string;
  dir: string;
  fetchListError: string;
  stickerStyle: boolean;
}

export const PART_CONFIGS: PartConfig[] = [
  { table: 'faces', path: '/api/face', dir: 'face', fetchListError: 'Failed to fetch faces', stickerStyle: false },
  { table: 'front_hairs', path: '/api/front-hair', dir: 'frontHair', fetchListError: 'Failed to fetch front hairs', stickerStyle: false },
  { table: 'back_hairs', path: '/api/back-hair', dir: 'backHair', fetchListError: 'Failed to fetch back hairs', stickerStyle: false },
  { table: 'costumes', path: '/api/costume', dir: 'costume', fetchListError: 'Failed to fetch costumes', stickerStyle: false },
  { table: 'stickers', path: '/api/sticker', dir: 'sticker', fetchListError: 'Failed to fetch stickers', stickerStyle: true },
];

// Sequelize の JSON 表現に合わせる（deleted は boolean、deletedAt は ISO 文字列か null）
export function partToJson(row: PartRow) {
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

async function findByPk(db: D1Database, table: string, id: string): Promise<PartRow | null> {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first<PartRow>();
}

export interface NewPart {
  name: string;
  assetPath: string;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

// sortOrder の採番と INSERT を単一文で行う（backgrounds.ts の insertBackground と同じ方式）。
// 一意制約（部分インデックス idx_<table>_sort_order_active）に当たった場合は1回だけ再試行する。
export async function insertPart(db: D1Database, table: string, input: NewPart): Promise<PartRow> {
  const attempt = () =>
    db
      .prepare(
        `INSERT INTO ${table} (name, assetPath, sortOrder, offsetX, offsetY, width, height)
         SELECT ?, ?, COALESCE(MAX(sortOrder), 0) + 1, ?, ?, ?, ?
         FROM ${table} WHERE deleted = 0
         RETURNING *`
      )
      .bind(input.name, input.assetPath, input.offsetX, input.offsetY, input.width, input.height)
      .first<PartRow>();
  try {
    return (await attempt())!;
  } catch (e) {
    if (!/UNIQUE constraint failed/i.test(e instanceof Error ? e.message : String(e))) throw e;
    console.warn(`sortOrder unique conflict on ${table} create; retrying once:`, e);
    return (await attempt())!;
  }
}

function parseOptionalInt(value: unknown, defaultValue: number): number | null {
  if (value === undefined || value === null || value === '') return defaultValue;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function validPositionSize(offsetX: number | null, offsetY: number | null, width: number | null, height: number | null) {
  return !(
    offsetX === null || offsetX < -1000 || offsetX > 1000 ||
    offsetY === null || offsetY < -1000 || offsetY > 1000 ||
    width === null || width < 1 || width > 2000 ||
    height === null || height < 1 || height > 2000
  );
}

// ---- CRUD（現行 api/routes/<type>.ts 相当。作成の JSON POST は背景スパイクと同じく
// アップロードなしのレコード作成意味論の再現） ----
export function createPartCrudApp(config: PartConfig) {
  const { table } = config;
  const app = new Hono<Vars>();

  // GET /api/<type>
  app.get('/', async (c) => {
    try {
      const { results } = await c.env.DB.prepare(
        `SELECT * FROM ${table} WHERE deleted = 0 ORDER BY sortOrder ASC, id ASC`
      ).all<PartRow>();
      return c.json(results.map(partToJson));
    } catch (e) {
      console.error(`Error fetching ${table}:`, e);
      return c.json({ error: config.fetchListError }, 500);
    }
  });

  // GET /api/<type>/:id
  app.get('/:id', async (c) => {
    try {
      const part = await findByPk(c.env.DB, table, c.req.param('id') as string);
      if (!part || part.deleted === 1) return c.json({ error: 'Not found' }, 404);
      return c.json(partToJson(part));
    } catch (error) {
      console.error(`Error fetching ${table} item:`, error);
      return c.json({ error: 'Fetch failed' }, 500);
    }
  });

  // POST /api/<type> （管理者専用）— 現行 /upload のレコード作成部分の再現
  app.post('/', requireAdminEnabled, authenticate, requireAdmin, async (c) => {
    try {
      const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
      const { name, assetPath } = body;
      if (typeof name !== 'string' || name === '' || typeof assetPath !== 'string' || assetPath === '') {
        // 現行は Sequelize の allowNull 検証で 500 になる。背景スパイクと揃えて 400 にしている（差異として報告）
        return c.json({ error: 'name and assetPath are required' }, 400);
      }
      const offsetX = parseOptionalInt(body.offsetX, 0);
      const offsetY = parseOptionalInt(body.offsetY, 0);
      const width = parseOptionalInt(body.width, 240);
      const height = parseOptionalInt(body.height, 320);
      if (!validPositionSize(offsetX, offsetY, width, height)) {
        return c.json({ error: 'Invalid position/size values' }, 400);
      }
      const inserted = await insertPart(c.env.DB, table, {
        name,
        assetPath,
        offsetX: offsetX!,
        offsetY: offsetY!,
        width: width!,
        height: height!,
      });
      return c.json(partToJson(inserted));
    } catch (err) {
      console.error(`Part create error (${table}):`, err);
      return c.json({ error: 'Internal server error' }, 500);
    }
  });

  // DELETE /api/<type>/:id (管理者専用) — 論理削除＋sortOrder を詰める
  app.delete('/:id', requireAdminEnabled, authenticate, requireAdmin, async (c) => {
    try {
      const part = await findByPk(c.env.DB, table, c.req.param('id') as string);
      if (!part || part.deleted === 1) return c.json({ error: 'Not found' }, 404);
      const deletedSortOrder = part.sortOrder;
      const statements = [
        c.env.DB.prepare(`UPDATE ${table} SET deleted = 1, deletedAt = ?, sortOrder = 0 WHERE id = ?`).bind(
          new Date().toISOString(),
          part.id
        ),
      ];
      if (deletedSortOrder > 0) {
        // 詰め直しは backgrounds と同じく大きなオフセットを経由する2文に分ける
        // （有効行の sortOrder 一意制約に途中状態で当たらないようにするため）
        const COMPACT_OFFSET = 1_000_000;
        statements.push(
          c.env.DB.prepare(`UPDATE ${table} SET sortOrder = sortOrder + ? WHERE deleted = 0 AND sortOrder > ?`).bind(
            COMPACT_OFFSET,
            deletedSortOrder
          ),
          c.env.DB.prepare(`UPDATE ${table} SET sortOrder = sortOrder - ? WHERE deleted = 0 AND sortOrder > ?`).bind(
            COMPACT_OFFSET + 1,
            COMPACT_OFFSET
          )
        );
      }
      await c.env.DB.batch(statements);
      // 物理ファイルの削除はコミット後（背景と同じ順序・扱い）。キーは assetPath から逆引きする
      const key = part.assetPath.replace(/^\/uploads\//, '');
      try {
        await c.env.UPLOADS.delete(key);
      } catch (fileError) {
        console.error('Failed to delete asset file in R2:', fileError);
      }
      return c.json({ success: true });
    } catch (error) {
      console.error(`Error deleting ${table} item:`, error);
      return c.json({ error: 'Delete failed' }, 500);
    }
  });

  // PUT /api/<type>/:id/order (管理者専用)
  app.put('/:id/order', requireAdminEnabled, authenticate, requireAdmin, async (c) => {
    try {
      const { direction } = (await c.req.json().catch(() => ({}))) as { direction?: string };
      const currentItem = await findByPk(c.env.DB, table, c.req.param('id') as string);
      if (!currentItem || currentItem.deleted === 1) return c.json({ error: 'Not found' }, 404);

      const { results: allItems } = await c.env.DB.prepare(
        `SELECT * FROM ${table} WHERE deleted = 0 ORDER BY sortOrder ASC, id ASC`
      ).all<PartRow>();
      const currentIndex = allItems.findIndex((item) => item.id === currentItem.id);
      if (currentIndex === -1) return c.json({ error: 'Not found' }, 404);

      let swapIndex = -1;
      if (direction === 'up' && currentIndex > 0) swapIndex = currentIndex - 1;
      else if (direction === 'down' && currentIndex < allItems.length - 1) swapIndex = currentIndex + 1;
      if (swapIndex === -1) return c.json({ success: true, message: 'Already at edge' });

      const swapItem = allItems[swapIndex];
      // sortOrder の交換は backgrounds と同じく一時値 0 を経由する3文にする
      await c.env.DB.batch([
        c.env.DB.prepare(`UPDATE ${table} SET sortOrder = 0 WHERE id = ?`).bind(currentItem.id),
        c.env.DB.prepare(`UPDATE ${table} SET sortOrder = ? WHERE id = ?`).bind(currentItem.sortOrder, swapItem.id),
        c.env.DB.prepare(`UPDATE ${table} SET sortOrder = ? WHERE id = ?`).bind(swapItem.sortOrder, currentItem.id),
      ]);
      return c.json({ success: true });
    } catch (error) {
      console.error(`Error updating ${table} order:`, error);
      return c.json({ error: 'Order update failed' }, 500);
    }
  });

  // PUT /api/<type>/:id (管理者専用) — 名前・位置・サイズの更新
  app.put('/:id', requireAdminEnabled, authenticate, requireAdmin, async (c) => {
    try {
      const part = await findByPk(c.env.DB, table, c.req.param('id') as string);
      if (!part || part.deleted === 1) return c.json({ error: 'Not found' }, 404);

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
        await c.env.DB.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`)
          .bind(...keys.map((k) => updates[k]), part.id)
          .run();
      }
      const updated = await findByPk(c.env.DB, table, String(part.id));
      return c.json(partToJson(updated!));
    } catch (e) {
      console.error(`Error updating ${table} item:`, e);
      return c.json({ error: 'Update failed' }, 500);
    }
  });

  return app;
}

// ---- アップロード（現行 api/routes/<type>-upload.ts 相当、保存先は R2） ----

// 現行 api/middleware/uploadValidation.ts と同じ制限
const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_EXTENSION = '.png';
const ALLOWED_IMAGE_MIME_TYPE = 'image/png';

function makeFilename(config: PartConfig, ext: string): string {
  if (config.stickerStyle) {
    // sticker の現行 multer は crypto.randomBytes(6).toString('hex')（同一ミリ秒の衝突回避）
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    const suffix = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${Date.now()}-${suffix}${ext}`;
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
}

export function createPartUploadApp(config: PartConfig) {
  const app = new Hono<Vars>();

  // POST /api/<type>/upload （管理者専用）
  // multipart/form-data: file フィールド名は現行と同じ 'asset'
  app.post('/upload', requireAdminEnabled, authenticate, requireAdmin, async (c) => {
    let key: string | null = null;
    try {
      const form = await c.req.formData().catch(() => null);
      const fileValue: unknown = form?.get('asset');
      if (!(fileValue instanceof File)) {
        return c.json({ error: 'No file uploaded' }, 400);
      }
      const file = fileValue;

      const dotIndex = file.name.lastIndexOf('.');
      const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';
      if (ext !== ALLOWED_IMAGE_EXTENSION || file.type !== ALLOWED_IMAGE_MIME_TYPE) {
        return c.json({ error: 'Only PNG images are allowed' }, 400);
      }
      if (file.size > MAX_UPLOAD_FILE_SIZE) {
        return c.json(
          { error: `File too large. Maximum size is ${MAX_UPLOAD_FILE_SIZE / (1024 * 1024)}MB` },
          400
        );
      }

      const name = form?.get('name');
      if (config.stickerStyle) {
        // sticker の現行は name の検証をアップロード側でも行い、空なら 400 'Invalid name value'
        if (typeof name !== 'string' || name.trim() === '') {
          return c.json({ error: 'Invalid name value' }, 400);
        }
      } else if (typeof name !== 'string' || name === '') {
        // 現行は Sequelize の allowNull 検証で 500 になる。背景スパイクと揃えて 400 にしている（差異として報告）
        return c.json({ error: 'name is required' }, 400);
      }

      const offsetX = parseOptionalInt(form?.get('offsetX'), 0);
      const offsetY = parseOptionalInt(form?.get('offsetY'), 0);
      const width = parseOptionalInt(form?.get('width'), 240);
      const height = parseOptionalInt(form?.get('height'), 320);
      if (!validPositionSize(offsetX, offsetY, width, height)) {
        return c.json({ error: 'Invalid position/size values' }, 400);
      }

      const filename = makeFilename(config, ext);
      key = `${config.dir}/${filename}`;
      const assetPath = `/uploads/${config.dir}/${filename}`;

      await c.env.UPLOADS.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type },
      });

      const inserted = await insertPart(c.env.DB, config.table, {
        name,
        assetPath,
        offsetX: offsetX!,
        offsetY: offsetY!,
        width: width!,
        height: height!,
      });
      return c.json(partToJson(inserted));
    } catch (err) {
      console.error(`Part upload error (${config.table}):`, err);
      if (key) {
        // DB 登録まで進まなかった場合は保存済みオブジェクトを消して巻き戻す（現行 removeUploadedFile 相当）
        await c.env.UPLOADS.delete(key).catch((deleteError) =>
          console.error('Failed to roll back uploaded file in R2:', deleteError)
        );
      }
      return c.json({ error: 'Internal server error' }, 500);
    }
  });

  return app;
}
