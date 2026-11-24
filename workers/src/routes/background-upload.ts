import { Hono } from 'hono';
import type { Env, AuthenticatedUser } from '../auth';
import { requireAdminEnabled, authenticate, requireAdmin } from '../middleware';
import { toJson, insertBackground } from './backgrounds';

// 現行 api/routes/background-upload.ts（multer → ローカルディスク保存）の Workers 版スパイク。
// 保存先を R2 に替えるが、DB に入る assetPath は現行互換の /uploads/background/<filename> のままにし、
// R2 のキーも assetPath から機械的に決まる（background/<filename>）ようにして互換を保つ。
// ディレクトリ名は PR #169 で正式名称に統一された background を使う（旧名は bg）。

type Vars = { Bindings: Env; Variables: { user: AuthenticatedUser } };

// 現行 api/middleware/uploadValidation.ts と同じ制限
const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_EXTENSION = '.png';
const ALLOWED_IMAGE_MIME_TYPE = 'image/png';

const app = new Hono<Vars>();

// POST /api/background/upload （管理者専用）
// multipart/form-data: file フィールド名は現行と同じ 'asset'、name / offsetX / offsetY / width / height はフォーム項目
app.post('/upload', requireAdminEnabled, authenticate, requireAdmin, async (c) => {
  let key: string | null = null;
  try {
    const form = await c.req.formData().catch(() => null);
    // workers-types の FormData.get は string 寄りの型付けのため unknown 経由で File 判定する
    const fileValue: unknown = form?.get('asset');
    if (!(fileValue instanceof File)) {
      return c.json({ error: 'No file uploaded' }, 400);
    }
    const file = fileValue;

    // 現行 imageFileFilter 相当：拡張子と MIME タイプの両方をクライアント申告ベースで照合
    const dotIndex = file.name.lastIndexOf('.');
    const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';
    if (ext !== ALLOWED_IMAGE_EXTENSION || file.type !== ALLOWED_IMAGE_MIME_TYPE) {
      return c.json({ error: 'Only PNG images are allowed' }, 400);
    }
    // 現行 singleImageUpload の LIMIT_FILE_SIZE 相当（検証エラーは 400 の JSON で返す）
    if (file.size > MAX_UPLOAD_FILE_SIZE) {
      return c.json(
        { error: `File too large. Maximum size is ${MAX_UPLOAD_FILE_SIZE / (1024 * 1024)}MB` },
        400
      );
    }

    const name = form?.get('name');
    if (typeof name !== 'string' || name === '') {
      // 現行は Sequelize の allowNull 検証で 500 になる。JSON POST 側のスパイクと揃えて 400 にしている（差異として報告）
      return c.json({ error: 'name is required' }, 400);
    }

    // 位置・サイズ（任意。未指定時はデフォルト値、整数でない・範囲外はエラー）。現行と同じ検証
    const parseOptionalInt = (value: unknown, defaultValue: number): number | null => {
      if (value === undefined || value === null || value === '') return defaultValue;
      const parsed = Number(value);
      return Number.isInteger(parsed) ? parsed : null;
    };
    const offsetX = parseOptionalInt(form?.get('offsetX'), 0);
    const offsetY = parseOptionalInt(form?.get('offsetY'), 0);
    const width = parseOptionalInt(form?.get('width'), 240);
    const height = parseOptionalInt(form?.get('height'), 320);
    if (
      offsetX === null || offsetX < -1000 || offsetX > 1000 ||
      offsetY === null || offsetY < -1000 || offsetY > 1000 ||
      width === null || width < 1 || width > 2000 ||
      height === null || height < 1 || height > 2000
    ) {
      return c.json({ error: 'Invalid position/size values' }, 400);
    }

    // ファイル名の付け方は現行 multer の filename コールバックと同じ（時刻 + ランダム文字列 + 拡張子）
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    key = `background/${filename}`;
    const assetPath = `/uploads/background/${filename}`;

    // 現行は multer が先にファイルを保存し、後段の失敗時に removeUploadedFile で消して巻き戻す。
    // ここでは検証をすべて通してから R2 に put し、DB 登録が失敗した場合だけ R2 側を消すことで
    // 同じ「失敗時にファイルを残さない」性質を保つ
    await c.env.UPLOADS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });

    // 採番は JSON POST 側と共通の insertBackground（単一文採番＋制約競合時の1回再試行）を使う。
    // 再試行しても失敗した場合は例外になり、下の catch で R2 側を巻き戻す（従来どおり）
    const inserted = await insertBackground(c.env.DB, { name, assetPath, offsetX, offsetY, width, height });
    return c.json(toJson(inserted));
  } catch (err) {
    console.error('Background upload error:', err);
    if (key) {
      // DB 登録まで進まなかった場合は保存済みオブジェクトを消して巻き戻す（現行 removeUploadedFile 相当）
      await c.env.UPLOADS.delete(key).catch((deleteError) =>
        console.error('Failed to roll back uploaded file in R2:', deleteError)
      );
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
