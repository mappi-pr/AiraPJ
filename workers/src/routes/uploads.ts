import type { Context } from 'hono';
import type { Env } from '../auth';

// 現行 api/index.ts の express.static('/uploads') 相当を Worker で再現する配信ハンドラ。
// DB の assetPath は現行互換の /uploads/<key> のままで、ここで R2 のキーに読み替えて返す。
// この方式なら既存データ（assetPath）とフロントの参照方法を変えずに保存先だけ R2 に移せる。
export async function serveUpload(c: Context<{ Bindings: Env }>) {
  const key = c.req.path.replace(/^\/uploads\//, '');
  if (key === '' || key.includes('..')) {
    return c.json({ error: 'Not found' }, 404);
  }
  const object = await c.env.UPLOADS.get(key);
  if (!object) {
    return c.json({ error: 'Not found' }, 404);
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  return new Response(object.body, { headers });
}
