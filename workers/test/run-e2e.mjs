// スパイク用 e2e ハーネス:
// - テスト用 RSA 鍵を生成し、JWKS をローカル HTTP サーバ (127.0.0.1:8791) で配信
// - wrangler dev を GOOGLE_JWKS_URL 差し替えで起動し、署名付き ID トークンで実際に叩く
// - D1 は wrangler のローカル D1 (miniflare) を使う
import { generateKeyPairSync, createSign } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';

const CLIENT_ID = 'spike-test-client-id';
const KID = 'spike-test-key-1';
const JWKS_PORT = 8791;
const DEV_PORT = 8787;
const DEV_PORT_NOADMIN = 8788;
const BASE = `http://127.0.0.1:${DEV_PORT}`;
const BASE_NOADMIN = `http://127.0.0.1:${DEV_PORT_NOADMIN}`;

// ---- テスト鍵と JWKS ----
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' });
jwk.kid = KID;
jwk.alg = 'RS256';
jwk.use = 'sig';

const jwksServer = createServer((req, res) => {
  if (req.url === '/jwks.json') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ keys: [jwk] }));
  } else {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => jwksServer.listen(JWKS_PORT, '127.0.0.1', resolve));

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signToken({ email, aud = CLIENT_ID, iss = 'https://accounts.google.com', expOffsetSec = 3600, name = 'Spike User' }) {
  const header = b64url(JSON.stringify({ alg: 'RS256', kid: KID, typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      iss,
      aud,
      sub: 'spike-subject',
      email,
      name,
      picture: 'https://example.com/pic.png',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + expOffsetSec,
    })
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

// ---- D1 準備 ----
function wrangler(args) {
  return execFileSync('npx', ['wrangler', ...args], { stdio: 'pipe', encoding: 'utf8' });
}
console.log('== applying migrations to local D1 ==');
console.log(wrangler(['d1', 'migrations', 'apply', 'airapj-spike', '--local']).slice(-400));
console.log('== seeding ==');
wrangler(['d1', 'execute', 'airapj-spike', '--local', '--file', 'test/seed.sql']);

// ---- wrangler dev 起動 ----
function startDev(port, extraVars = []) {
  // inspector ポート (既定 9229) はインスタンスごとに分け、プロセスグループごと終了できるよう detached で起動する
  const child = spawn(
    'npx',
    [
      'wrangler', 'dev', '--port', String(port), '--inspector-port', String(port + 442),
      '--var', `GOOGLE_JWKS_URL:http://127.0.0.1:${JWKS_PORT}/jwks.json`, ...extraVars,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], detached: true }
  );
  child.stderr.on('data', (d) => process.stderr.write(`[wrangler:${port}] ${d}`));
  return child;
}

function stopDev(child) {
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
}

async function waitReady(base, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${base}/api/background`);
      if (res.status === 200) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`wrangler dev did not become ready at ${base}`);
}

const dev = startDev(DEV_PORT);
const devNoAdmin = startDev(DEV_PORT_NOADMIN, ['--var', 'ADMIN_ENABLED:false']);

// ---- アサーション ----
let passed = 0;
let failed = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label} => ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
}

async function req(base, method, path, { token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* leave null */
  }
  return { status: res.status, json };
}

try {
  await waitReady(BASE);
  await waitReady(BASE_NOADMIN);
  console.log('== wrangler dev ready ==');

  const userToken = signToken({ email: 'user@example.com' });
  const gmToken = signToken({ email: 'gm@example.com' });
  const adminToken = signToken({ email: 'admin@example.com' });
  const adminUpperToken = signToken({ email: 'ADMIN@EXAMPLE.COM' });
  const expiredToken = signToken({ email: 'user@example.com', expOffsetSec: -60 });
  const wrongAudToken = signToken({ email: 'user@example.com', aud: 'other-client' });

  // 認証: /api/auth/verify
  check('verify: no token -> 400', (await req(BASE, 'POST', '/api/auth/verify', { body: {} })).status, 400);
  check('verify: garbage token -> 401', (await req(BASE, 'POST', '/api/auth/verify', { body: { token: 'not-a-jwt' } })).status, 401);
  check('verify: expired token -> 401', (await req(BASE, 'POST', '/api/auth/verify', { body: { token: expiredToken } })).status, 401);
  check('verify: wrong aud -> 401', (await req(BASE, 'POST', '/api/auth/verify', { body: { token: wrongAudToken } })).status, 401);

  const vUser = await req(BASE, 'POST', '/api/auth/verify', { body: { token: userToken } });
  check('verify: user -> 200', vUser.status, 200);
  check('verify: user role', vUser.json?.role, 'user');
  check('verify: user isAdmin', vUser.json?.isAdmin, false);

  const vGm = await req(BASE, 'POST', '/api/auth/verify', { body: { token: gmToken } });
  check('verify: game master role', vGm.json?.role, 'game_master');
  check('verify: game master isAdmin', vGm.json?.isAdmin, true);

  const vAdmin = await req(BASE, 'POST', '/api/auth/verify', { body: { token: adminToken } });
  check('verify: system admin role (env list is mixed-case)', vAdmin.json?.role, 'system_admin');
  const vAdminUpper = await req(BASE, 'POST', '/api/auth/verify', { body: { token: adminUpperToken } });
  check('verify: system admin role (token email upper-case)', vAdminUpper.json?.role, 'system_admin');

  // 背景: 一覧・詳細
  const list = await req(BASE, 'GET', '/api/background');
  check('backgrounds: list status', list.status, 200);
  check('backgrounds: list excludes deleted', list.json?.map((b) => b.name), ['bg-a', 'bg-b', 'bg-c']);
  check('backgrounds: deleted is boolean', list.json?.[0]?.deleted, false);
  const goneId = 4;
  check('backgrounds: deleted detail -> 404', (await req(BASE, 'GET', `/api/background/${goneId}`)).status, 404);
  check('backgrounds: missing detail -> 404', (await req(BASE, 'GET', '/api/background/9999')).status, 404);

  // 背景: 作成の権限
  check('backgrounds: create without token -> 401', (await req(BASE, 'POST', '/api/background', { body: { name: 'x', assetPath: '/uploads/bg/x.png' } })).status, 401);
  check('backgrounds: create as user -> 403', (await req(BASE, 'POST', '/api/background', { token: userToken, body: { name: 'x', assetPath: '/uploads/bg/x.png' } })).status, 403);
  const created = await req(BASE, 'POST', '/api/background', { token: gmToken, body: { name: 'bg-d', assetPath: '/uploads/bg/d.png' } });
  check('backgrounds: create as game master -> 200', created.status, 200);
  check('backgrounds: created sortOrder is max+1', created.json?.sortOrder, 4);
  check('backgrounds: created defaults width/height', [created.json?.width, created.json?.height], [240, 320]);
  const createdId = created.json?.id;

  // 背景: 更新バリデーション
  check('backgrounds: update width=0 -> 400', (await req(BASE, 'PUT', `/api/background/${createdId}`, { token: adminToken, body: { width: 0 } })).status, 400);
  const updated = await req(BASE, 'PUT', `/api/background/${createdId}`, { token: adminToken, body: { name: 'bg-d2', offsetX: -5 } });
  check('backgrounds: update ok', [updated.status, updated.json?.name, updated.json?.offsetX], [200, 'bg-d2', -5]);

  // 背景: 並び替え
  const orderRes = await req(BASE, 'PUT', `/api/background/${createdId}/order`, { token: adminToken, body: { direction: 'up' } });
  check('backgrounds: order swap -> success', orderRes.json?.success, true);
  const listAfterOrder = await req(BASE, 'GET', '/api/background');
  check('backgrounds: order after swap', listAfterOrder.json?.map((b) => b.name), ['bg-a', 'bg-b', 'bg-d2', 'bg-c']);

  // 背景: 論理削除 + sortOrder を詰める
  const bgB = listAfterOrder.json?.find((b) => b.name === 'bg-b');
  const del = await req(BASE, 'DELETE', `/api/background/${bgB.id}`, { token: adminToken });
  check('backgrounds: delete -> success', del.json?.success, true);
  const listAfterDelete = await req(BASE, 'GET', '/api/background');
  check('backgrounds: after delete names', listAfterDelete.json?.map((b) => b.name), ['bg-a', 'bg-d2', 'bg-c']);
  check('backgrounds: after delete sortOrders compacted', listAfterDelete.json?.map((b) => b.sortOrder), [1, 2, 3]);
  check('backgrounds: deleted detail -> 404', (await req(BASE, 'GET', `/api/background/${bgB.id}`)).status, 404);
  check('backgrounds: delete again -> 404', (await req(BASE, 'DELETE', `/api/background/${bgB.id}`, { token: adminToken })).status, 404);

  // 背景アップロード（R2 保存）: multipart で送り、assetPath 経由で取得し、削除で R2 からも消えること
  async function reqForm(base, method, path, { token, fields = {}, file } = {}) {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    if (file) form.append('asset', new Blob([file.bytes], { type: file.type }), file.name);
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: form,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* leave null */
    }
    return { status: res.status, json };
  }

  // 1x1 の PNG
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );
  const pngFile = { bytes: pngBytes, type: 'image/png', name: 'pixel.png' };
  const MAX_SIZE_TEST = 10 * 1024 * 1024; // 現行 MAX_UPLOAD_FILE_SIZE と同じ 10MB

  check('upload: without token -> 401', (await reqForm(BASE, 'POST', '/api/background/upload', { file: pngFile, fields: { name: 'bg-up' } })).status, 401);
  check('upload: as user -> 403', (await reqForm(BASE, 'POST', '/api/background/upload', { token: userToken, file: pngFile, fields: { name: 'bg-up' } })).status, 403);
  check('upload: no file -> 400', (await reqForm(BASE, 'POST', '/api/background/upload', { token: gmToken, fields: { name: 'bg-up' } })).status, 400);
  check('upload: non-PNG -> 400', (await reqForm(BASE, 'POST', '/api/background/upload', { token: gmToken, file: { bytes: Buffer.from('hello'), type: 'text/plain', name: 'x.txt' }, fields: { name: 'bg-up' } })).status, 400);
  check('upload: PNG name but wrong MIME -> 400', (await reqForm(BASE, 'POST', '/api/background/upload', { token: gmToken, file: { bytes: pngBytes, type: 'text/plain', name: 'x.png' }, fields: { name: 'bg-up' } })).status, 400);
  const oversized = await reqForm(BASE, 'POST', '/api/background/upload', {
    token: gmToken,
    file: { bytes: new Uint8Array(MAX_SIZE_TEST + 1), type: 'image/png', name: 'big.png' },
    fields: { name: 'bg-big' },
  });
  check('upload: over 10MB -> 400', oversized.status, 400);
  check('upload: over 10MB error message', oversized.json?.error, 'File too large. Maximum size is 10MB');
  check('upload: invalid width -> 400', (await reqForm(BASE, 'POST', '/api/background/upload', { token: gmToken, file: pngFile, fields: { name: 'bg-up', width: '0' } })).status, 400);
  check('upload: failed uploads create no records', (await req(BASE, 'GET', '/api/background')).json?.length, 3);

  const uploaded = await reqForm(BASE, 'POST', '/api/background/upload', {
    token: gmToken,
    file: pngFile,
    fields: { name: 'bg-up', offsetX: '5' },
  });
  check('upload: as game master -> 200', uploaded.status, 200);
  check('upload: name stored', uploaded.json?.name, 'bg-up');
  check('upload: offsetX stored', uploaded.json?.offsetX, 5);
  check('upload: sortOrder is max+1', uploaded.json?.sortOrder, 4);
  check(
    'upload: assetPath keeps /uploads/bg/<file>.png format',
    /^\/uploads\/bg\/\d+-[a-z0-9]+\.png$/.test(uploaded.json?.assetPath ?? ''),
    true
  );
  const uploadedId = uploaded.json?.id;
  const uploadedPath = uploaded.json?.assetPath;

  // 配信: assetPath をそのまま GET して、上げたバイト列と一致すること（認証なし＝現行の静的配信と同じ）
  const served = await fetch(`${BASE}${uploadedPath}`);
  check('uploads: GET assetPath -> 200', served.status, 200);
  check('uploads: content-type is image/png', served.headers.get('content-type'), 'image/png');
  const servedBytes = Buffer.from(await served.arrayBuffer());
  check('uploads: served bytes match uploaded bytes', servedBytes.equals(pngBytes), true);
  check('uploads: missing object -> 404', (await fetch(`${BASE}/uploads/bg/no-such-file.png`)).status, 404);

  // 削除: 論理削除後に assetPath へアクセスすると 404（R2 オブジェクトも消えている）
  const delUploaded = await req(BASE, 'DELETE', `/api/background/${uploadedId}`, { token: adminToken });
  check('upload: delete uploaded -> success', delUploaded.json?.success, true);
  check('uploads: after delete GET assetPath -> 404', (await fetch(`${BASE}${uploadedPath}`)).status, 404);
  const listAfterUploadDelete = await req(BASE, 'GET', '/api/background');
  check('upload: after delete list is back to 3 items', listAfterUploadDelete.json?.map((b) => b.name), ['bg-a', 'bg-d2', 'bg-c']);

  // ADMIN_ENABLED=false のとき管理系は 404（現行 adminGate と同じ）
  check('adminGate: create with ADMIN_ENABLED=false -> 404', (await req(BASE_NOADMIN, 'POST', '/api/background', { token: adminToken, body: { name: 'x', assetPath: '/uploads/bg/x.png' } })).status, 404);
  check('adminGate: list still 200 with ADMIN_ENABLED=false', (await req(BASE_NOADMIN, 'GET', '/api/background')).status, 200);

  // sortOrder 採番の同時実行競合（#166 ちゃっぴー監査対応）:
  // 作成リクエストを並行で投げても、全件成功し sortOrder が重複しないこと。
  // この時点の有効行は bg-a(1), bg-d2(2), bg-c(3) の3件なので、次は 4 から採番される前提
  const parallelCreates = await Promise.all(
    ['bg-p1', 'bg-p2', 'bg-p3', 'bg-p4', 'bg-p5'].map((name) =>
      req(BASE, 'POST', '/api/background', { token: adminToken, body: { name, assetPath: `/uploads/bg/${name}.png` } })
    )
  );
  check('parallel: all 5 creates -> 200', parallelCreates.map((r) => r.status), [200, 200, 200, 200, 200]);
  check(
    'parallel: sortOrders are distinct 4..8',
    parallelCreates.map((r) => r.json?.sortOrder).sort((a, b) => a - b),
    [4, 5, 6, 7, 8]
  );
  const listAfterParallel = await req(BASE, 'GET', '/api/background');
  check('parallel: list sortOrders are 1..8 without duplicates', listAfterParallel.json?.map((b) => b.sortOrder), [1, 2, 3, 4, 5, 6, 7, 8]);

  // アップロード経由の作成（採番コードは共通）も並行で投げる
  const parallelUploads = await Promise.all(
    ['bg-pu1', 'bg-pu2', 'bg-pu3'].map((name) =>
      reqForm(BASE, 'POST', '/api/background/upload', { token: gmToken, file: pngFile, fields: { name } })
    )
  );
  check('parallel upload: all 3 uploads -> 200', parallelUploads.map((r) => r.status), [200, 200, 200]);
  check(
    'parallel upload: sortOrders are distinct 9..11',
    parallelUploads.map((r) => r.json?.sortOrder).sort((a, b) => a - b),
    [9, 10, 11]
  );
  const listFinal = await req(BASE, 'GET', '/api/background');
  check('parallel upload: list has 11 items', listFinal.json?.length, 11);
} finally {
  stopDev(dev);
  stopDev(devNoAdmin);
  jwksServer.close();
}

console.log(`\n== RESULT: ${passed} passed, ${failed} failed ==`);
process.exit(failed > 0 ? 1 : 0);
