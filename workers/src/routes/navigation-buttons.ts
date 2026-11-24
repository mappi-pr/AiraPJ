import { Hono } from 'hono';
import type { Env, AuthenticatedUser } from '../auth';
import { requireAdminEnabled, authenticate, requireAdmin } from '../middleware';

// 現行 api/routes/navigationButton.ts + navigationButton-upload.ts の Workers(D1/R2) 版。
// 他パーツと違い sortOrder・論理削除はなく、buttonType ('prev' | 'next') ごとに1行だけを持つ。
// 現行はサーバ起動時に prev / next のデフォルト行（assetPath = null）を初期化するため、
// ここでは各ハンドラの先頭で INSERT OR IGNORE により同等の初期化を再現する。
// 保存先ディレクトリは PR #169 で正式名称に統一された 'navigationButton' を使う
// （現行コード上の旧名は 'nav'）。

type Vars = { Bindings: Env; Variables: { user: AuthenticatedUser } };

interface NavigationButtonRow {
  id: number;
  buttonType: string;
  assetPath: string | null;
}

function toJson(row: NavigationButtonRow) {
  return { id: row.id, buttonType: row.buttonType, assetPath: row.assetPath };
}

const INVALID_TYPE_ERROR = 'Invalid buttonType. Must be "prev" or "next".';

async function ensureDefaults(db: D1Database) {
  await db
    .prepare(
      `INSERT OR IGNORE INTO navigation_buttons (buttonType, assetPath) VALUES ('prev', NULL), ('next', NULL)`
    )
    .run();
}

async function findByType(db: D1Database, buttonType: string): Promise<NavigationButtonRow | null> {
  return db
    .prepare('SELECT * FROM navigation_buttons WHERE buttonType = ?')
    .bind(buttonType)
    .first<NavigationButtonRow>();
}

// 現行 api/middleware/uploadValidation.ts と同じ制限
const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_EXTENSION = '.png';
const ALLOWED_IMAGE_MIME_TYPE = 'image/png';

const app = new Hono<Vars>();

// GET /api/navigation-buttons
app.get('/', async (c) => {
  try {
    await ensureDefaults(c.env.DB);
    const { results } = await c.env.DB.prepare('SELECT * FROM navigation_buttons ORDER BY id ASC').all<NavigationButtonRow>();
    return c.json(results.map(toJson));
  } catch (e) {
    console.error('Error fetching navigation buttons:', e);
    return c.json({ error: 'Failed to fetch navigation buttons' }, 500);
  }
});

// POST /api/navigation-buttons/upload （管理者専用）
// multipart/form-data: file フィールド名は現行と同じ 'asset'、buttonType はフォーム項目
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

    const buttonType = form?.get('buttonType');
    if (buttonType !== 'prev' && buttonType !== 'next') {
      return c.json({ error: INVALID_TYPE_ERROR }, 400);
    }

    await ensureDefaults(c.env.DB);
    const existing = await findByType(c.env.DB, buttonType);

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    key = `navigationButton/${filename}`;
    const assetPath = `/uploads/navigationButton/${filename}`;

    // 現行は multer が先に保存し、後段の失敗時に消して巻き戻す。ここでは検証を通してから put し、
    // DB 更新が失敗した場合だけ R2 側を消すことで同じ性質を保つ（背景アップロードと同じ方式）
    await c.env.UPLOADS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    await c.env.DB.prepare('UPDATE navigation_buttons SET assetPath = ? WHERE buttonType = ?')
      .bind(assetPath, buttonType)
      .run();

    // 差し替え前の旧ファイルは現行と同じく削除する。失敗しても更新自体は成立しているため
    // ログに留める（背景の論理削除時のファイル削除と同じ扱い）
    if (existing?.assetPath) {
      const oldKey = existing.assetPath.replace(/^\/uploads\//, '');
      try {
        await c.env.UPLOADS.delete(oldKey);
      } catch (fileError) {
        console.error('Failed to delete old navigation button file in R2:', fileError);
      }
    }

    const updated = await findByType(c.env.DB, buttonType);
    return c.json(toJson(updated!));
  } catch (err) {
    console.error('Navigation button upload error:', err);
    if (key) {
      await c.env.UPLOADS.delete(key).catch((deleteError) =>
        console.error('Failed to roll back uploaded file in R2:', deleteError)
      );
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// DELETE /api/navigation-buttons/:buttonType/reset （管理者専用）— assetPath を null に戻す
app.delete('/:buttonType/reset', requireAdminEnabled, authenticate, requireAdmin, async (c) => {
  try {
    const buttonType = c.req.param('buttonType') as string;
    if (buttonType !== 'prev' && buttonType !== 'next') {
      return c.json({ error: INVALID_TYPE_ERROR }, 400);
    }

    await ensureDefaults(c.env.DB);
    const button = await findByType(c.env.DB, buttonType);
    if (!button) return c.json({ error: 'Not found' }, 404);

    if (button.assetPath) {
      const key = button.assetPath.replace(/^\/uploads\//, '');
      try {
        await c.env.UPLOADS.delete(key);
      } catch (fileError) {
        console.error('Failed to delete navigation button file in R2:', fileError);
      }
    }

    await c.env.DB.prepare('UPDATE navigation_buttons SET assetPath = NULL WHERE id = ?').bind(button.id).run();
    const updated = await findByType(c.env.DB, buttonType);
    return c.json({ success: true, button: toJson(updated!) });
  } catch (e) {
    console.error('Navigation button reset error:', e);
    return c.json({ error: 'Reset failed' }, 500);
  }
});

export default app;
