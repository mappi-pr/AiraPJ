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
  check('backgrounds: create without token -> 401', (await req(BASE, 'POST', '/api/background', { body: { name: 'x', assetPath: '/uploads/background/x.png' } })).status, 401);
  check('backgrounds: create as user -> 403', (await req(BASE, 'POST', '/api/background', { token: userToken, body: { name: 'x', assetPath: '/uploads/background/x.png' } })).status, 403);
  const created = await req(BASE, 'POST', '/api/background', { token: gmToken, body: { name: 'bg-d', assetPath: '/uploads/background/d.png' } });
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
    'upload: assetPath keeps /uploads/background/<file>.png format',
    /^\/uploads\/background\/\d+-[a-z0-9]+\.png$/.test(uploaded.json?.assetPath ?? ''),
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
  check('uploads: missing object -> 404', (await fetch(`${BASE}/uploads/background/no-such-file.png`)).status, 404);

  // 削除: 論理削除後に assetPath へアクセスすると 404（R2 オブジェクトも消えている）
  const delUploaded = await req(BASE, 'DELETE', `/api/background/${uploadedId}`, { token: adminToken });
  check('upload: delete uploaded -> success', delUploaded.json?.success, true);
  check('uploads: after delete GET assetPath -> 404', (await fetch(`${BASE}${uploadedPath}`)).status, 404);
  const listAfterUploadDelete = await req(BASE, 'GET', '/api/background');
  check('upload: after delete list is back to 3 items', listAfterUploadDelete.json?.map((b) => b.name), ['bg-a', 'bg-d2', 'bg-c']);

  // ADMIN_ENABLED=false のとき管理系は 404（現行 adminGate と同じ）
  check('adminGate: create with ADMIN_ENABLED=false -> 404', (await req(BASE_NOADMIN, 'POST', '/api/background', { token: adminToken, body: { name: 'x', assetPath: '/uploads/background/x.png' } })).status, 404);
  check('adminGate: list still 200 with ADMIN_ENABLED=false', (await req(BASE_NOADMIN, 'GET', '/api/background')).status, 200);

  // sortOrder 採番の同時実行競合（#166 ちゃっぴー監査対応）:
  // 作成リクエストを並行で投げても、全件成功し sortOrder が重複しないこと。
  // この時点の有効行は bg-a(1), bg-d2(2), bg-c(3) の3件なので、次は 4 から採番される前提
  const parallelCreates = await Promise.all(
    ['bg-p1', 'bg-p2', 'bg-p3', 'bg-p4', 'bg-p5'].map((name) =>
      req(BASE, 'POST', '/api/background', { token: adminToken, body: { name, assetPath: `/uploads/background/${name}.png` } })
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

  // ---- パーツ系5種別（face / front-hair / back-hair / costume / sticker） ----
  // シードは種別ごとに有効行2件（sortOrder 1,2）と削除済み1件（id=3）。背景と同じ流れを通す
  const partTypes = [
    { key: 'face', path: '/api/face', dir: 'face', a: 'face-a', b: 'face-b' },
    { key: 'frontHair', path: '/api/front-hair', dir: 'frontHair', a: 'front-a', b: 'front-b' },
    { key: 'backHair', path: '/api/back-hair', dir: 'backHair', a: 'back-a', b: 'back-b' },
    { key: 'costume', path: '/api/costume', dir: 'costume', a: 'costume-a', b: 'costume-b' },
    { key: 'sticker', path: '/api/sticker', dir: 'sticker', a: 'sticker-a', b: 'sticker-b' },
  ];
  for (const t of partTypes) {
    const pList = await req(BASE, 'GET', t.path);
    check(`${t.key}: list status`, pList.status, 200);
    check(`${t.key}: list excludes deleted`, pList.json?.map((x) => x.name), [t.a, t.b]);
    check(`${t.key}: deleted is boolean`, pList.json?.[0]?.deleted, false);
    check(`${t.key}: deleted detail -> 404`, (await req(BASE, 'GET', `${t.path}/3`)).status, 404);
    check(`${t.key}: missing detail -> 404`, (await req(BASE, 'GET', `${t.path}/9999`)).status, 404);

    check(`${t.key}: create without token -> 401`, (await req(BASE, 'POST', t.path, { body: { name: 'x', assetPath: `/uploads/${t.dir}/x.png` } })).status, 401);
    check(`${t.key}: create as user -> 403`, (await req(BASE, 'POST', t.path, { token: userToken, body: { name: 'x', assetPath: `/uploads/${t.dir}/x.png` } })).status, 403);
    const pCreated = await req(BASE, 'POST', t.path, { token: gmToken, body: { name: `${t.key}-c`, assetPath: `/uploads/${t.dir}/c.png` } });
    check(`${t.key}: create as game master -> 200`, pCreated.status, 200);
    check(`${t.key}: created sortOrder is max+1`, pCreated.json?.sortOrder, 3);
    check(`${t.key}: created defaults width/height`, [pCreated.json?.width, pCreated.json?.height], [240, 320]);
    const pCreatedId = pCreated.json?.id;

    check(`${t.key}: update width=0 -> 400`, (await req(BASE, 'PUT', `${t.path}/${pCreatedId}`, { token: adminToken, body: { width: 0 } })).status, 400);
    const pUpdated = await req(BASE, 'PUT', `${t.path}/${pCreatedId}`, { token: adminToken, body: { name: `${t.key}-c2`, offsetX: -5 } });
    check(`${t.key}: update ok`, [pUpdated.status, pUpdated.json?.name, pUpdated.json?.offsetX], [200, `${t.key}-c2`, -5]);

    const pOrder = await req(BASE, 'PUT', `${t.path}/${pCreatedId}/order`, { token: adminToken, body: { direction: 'up' } });
    check(`${t.key}: order swap -> success`, pOrder.json?.success, true);
    const pListAfterOrder = await req(BASE, 'GET', t.path);
    check(`${t.key}: order after swap`, pListAfterOrder.json?.map((x) => x.name), [t.a, `${t.key}-c2`, t.b]);

    // アップロード（R2 保存）
    check(`${t.key} upload: without token -> 401`, (await reqForm(BASE, 'POST', `${t.path}/upload`, { file: pngFile, fields: { name: `${t.key}-up` } })).status, 401);
    check(`${t.key} upload: as user -> 403`, (await reqForm(BASE, 'POST', `${t.path}/upload`, { token: userToken, file: pngFile, fields: { name: `${t.key}-up` } })).status, 403);
    check(`${t.key} upload: no file -> 400`, (await reqForm(BASE, 'POST', `${t.path}/upload`, { token: gmToken, fields: { name: `${t.key}-up` } })).status, 400);
    check(`${t.key} upload: non-PNG -> 400`, (await reqForm(BASE, 'POST', `${t.path}/upload`, { token: gmToken, file: { bytes: Buffer.from('hello'), type: 'text/plain', name: 'x.txt' }, fields: { name: `${t.key}-up` } })).status, 400);
    if (t.key === 'sticker') {
      // sticker だけ現行アップロードに name 検証がある（400 'Invalid name value'）
      const noName = await reqForm(BASE, 'POST', `${t.path}/upload`, { token: gmToken, file: pngFile, fields: {} });
      check('sticker upload: missing name -> 400', noName.status, 400);
      check('sticker upload: missing name error', noName.json?.error, 'Invalid name value');
    }
    const pUploaded = await reqForm(BASE, 'POST', `${t.path}/upload`, {
      token: gmToken,
      file: pngFile,
      fields: { name: `${t.key}-up`, offsetX: '5' },
    });
    check(`${t.key} upload: as game master -> 200`, pUploaded.status, 200);
    check(`${t.key} upload: sortOrder is max+1`, pUploaded.json?.sortOrder, 4);
    check(
      `${t.key} upload: assetPath format`,
      new RegExp(`^/uploads/${t.dir}/\\d+-[a-z0-9]+\\.png$`).test(pUploaded.json?.assetPath ?? ''),
      true
    );
    const pUploadedId = pUploaded.json?.id;
    const pUploadedPath = pUploaded.json?.assetPath;
    const pServed = await fetch(`${BASE}${pUploadedPath}`);
    check(`${t.key} uploads: GET assetPath -> 200`, pServed.status, 200);
    const pServedBytes = Buffer.from(await pServed.arrayBuffer());
    check(`${t.key} uploads: served bytes match uploaded bytes`, pServedBytes.equals(pngBytes), true);

    const pDelUploaded = await req(BASE, 'DELETE', `${t.path}/${pUploadedId}`, { token: adminToken });
    check(`${t.key} upload: delete uploaded -> success`, pDelUploaded.json?.success, true);
    check(`${t.key} uploads: after delete GET assetPath -> 404`, (await fetch(`${BASE}${pUploadedPath}`)).status, 404);

    // 論理削除 + 詰め直し（並び替え後の並びは a(1), c2(2), b(3)。b を消すと [1,2] に詰まる）
    const pB = (await req(BASE, 'GET', t.path)).json?.find((x) => x.name === t.b);
    const pDel = await req(BASE, 'DELETE', `${t.path}/${pB.id}`, { token: adminToken });
    check(`${t.key}: delete -> success`, pDel.json?.success, true);
    const pListAfterDelete = await req(BASE, 'GET', t.path);
    check(`${t.key}: after delete names`, pListAfterDelete.json?.map((x) => x.name), [t.a, `${t.key}-c2`]);
    check(`${t.key}: after delete sortOrders compacted`, pListAfterDelete.json?.map((x) => x.sortOrder), [1, 2]);
    check(`${t.key}: delete again -> 404`, (await req(BASE, 'DELETE', `${t.path}/${pB.id}`, { token: adminToken })).status, 404);

    // 並行作成でも sortOrder が重複しない（有効行は a(1), c2(2) なので次は 3..5）
    const pParallel = await Promise.all(
      [`${t.key}-p1`, `${t.key}-p2`, `${t.key}-p3`].map((name) =>
        req(BASE, 'POST', t.path, { token: adminToken, body: { name, assetPath: `/uploads/${t.dir}/${name}.png` } })
      )
    );
    check(`${t.key} parallel: all 3 creates -> 200`, pParallel.map((r) => r.status), [200, 200, 200]);
    check(
      `${t.key} parallel: sortOrders are distinct 3..5`,
      pParallel.map((r) => r.json?.sortOrder).sort((x, y) => x - y),
      [3, 4, 5]
    );
  }

  // パーツ系も ADMIN_ENABLED=false で管理系は 404（代表として face）
  check('adminGate: face create with ADMIN_ENABLED=false -> 404', (await req(BASE_NOADMIN, 'POST', '/api/face', { token: adminToken, body: { name: 'x', assetPath: '/uploads/face/x.png' } })).status, 404);
  check('adminGate: face list still 200 with ADMIN_ENABLED=false', (await req(BASE_NOADMIN, 'GET', '/api/face')).status, 200);

  // ---- ナビゲーションボタン（prev/next の2行固定、sortOrder なし） ----
  const navList = await req(BASE, 'GET', '/api/navigation-buttons');
  check('nav: list status', navList.status, 200);
  check('nav: list has prev/next with null assetPath', navList.json?.map((b) => [b.buttonType, b.assetPath]), [['prev', null], ['next', null]]);

  check('nav upload: without token -> 401', (await reqForm(BASE, 'POST', '/api/navigation-buttons/upload', { file: pngFile, fields: { buttonType: 'prev' } })).status, 401);
  check('nav upload: as user -> 403', (await reqForm(BASE, 'POST', '/api/navigation-buttons/upload', { token: userToken, file: pngFile, fields: { buttonType: 'prev' } })).status, 403);
  check('nav upload: no file -> 400', (await reqForm(BASE, 'POST', '/api/navigation-buttons/upload', { token: gmToken, fields: { buttonType: 'prev' } })).status, 400);
  check('nav upload: non-PNG -> 400', (await reqForm(BASE, 'POST', '/api/navigation-buttons/upload', { token: gmToken, file: { bytes: Buffer.from('hello'), type: 'text/plain', name: 'x.txt' }, fields: { buttonType: 'prev' } })).status, 400);
  const navBadType = await reqForm(BASE, 'POST', '/api/navigation-buttons/upload', { token: gmToken, file: pngFile, fields: { buttonType: 'side' } });
  check('nav upload: invalid buttonType -> 400', navBadType.status, 400);
  check('nav upload: invalid buttonType error', navBadType.json?.error, 'Invalid buttonType. Must be "prev" or "next".');

  const navUp = await reqForm(BASE, 'POST', '/api/navigation-buttons/upload', { token: gmToken, file: pngFile, fields: { buttonType: 'prev' } });
  check('nav upload: as game master -> 200', navUp.status, 200);
  check('nav upload: buttonType stored', navUp.json?.buttonType, 'prev');
  check(
    'nav upload: assetPath format',
    /^\/uploads\/navigationButton\/\d+-[a-z0-9]+\.png$/.test(navUp.json?.assetPath ?? ''),
    true
  );
  const navPath1 = navUp.json?.assetPath;
  const navServed = await fetch(`${BASE}${navPath1}`);
  check('nav uploads: GET assetPath -> 200', navServed.status, 200);
  const navServedBytes = Buffer.from(await navServed.arrayBuffer());
  check('nav uploads: served bytes match uploaded bytes', navServedBytes.equals(pngBytes), true);

  // 差し替えると旧ファイルは消える
  const navUp2 = await reqForm(BASE, 'POST', '/api/navigation-buttons/upload', { token: gmToken, file: pngFile, fields: { buttonType: 'prev' } });
  check('nav upload: replace -> 200', navUp2.status, 200);
  const navPath2 = navUp2.json?.assetPath;
  check('nav upload: replace changes assetPath', navPath2 !== navPath1, true);
  check('nav uploads: replaced old file -> 404', (await fetch(`${BASE}${navPath1}`)).status, 404);
  check('nav uploads: replaced new file -> 200', (await fetch(`${BASE}${navPath2}`)).status, 200);
  const navListAfterUp = await req(BASE, 'GET', '/api/navigation-buttons');
  check('nav: list still has exactly prev/next', navListAfterUp.json?.map((b) => b.buttonType), ['prev', 'next']);
  check('nav: list reflects uploaded assetPath', navListAfterUp.json?.find((b) => b.buttonType === 'prev')?.assetPath, navPath2);

  // リセット: assetPath が null に戻り、ファイルも消える
  check('nav reset: invalid buttonType -> 400', (await req(BASE, 'DELETE', '/api/navigation-buttons/side/reset', { token: adminToken })).status, 400);
  check('nav reset: without token -> 401', (await req(BASE, 'DELETE', '/api/navigation-buttons/prev/reset')).status, 401);
  const navReset = await req(BASE, 'DELETE', '/api/navigation-buttons/prev/reset', { token: adminToken });
  check('nav reset: -> success', navReset.json?.success, true);
  check('nav reset: assetPath back to null', navReset.json?.button?.assetPath, null);
  check('nav uploads: after reset GET assetPath -> 404', (await fetch(`${BASE}${navPath2}`)).status, 404);
  const navResetAgain = await req(BASE, 'DELETE', '/api/navigation-buttons/prev/reset', { token: adminToken });
  check('nav reset: reset again (already null) -> success', navResetAgain.json?.success, true);

  check('adminGate: nav upload with ADMIN_ENABLED=false -> 404', (await reqForm(BASE_NOADMIN, 'POST', '/api/navigation-buttons/upload', { token: adminToken, file: pngFile, fields: { buttonType: 'next' } })).status, 404);
  check('adminGate: nav list still 200 with ADMIN_ENABLED=false', (await req(BASE_NOADMIN, 'GET', '/api/navigation-buttons')).status, 200);

  // ---- 生成履歴（認証不要、userId がキー） ----
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const bgA = (await req(BASE, 'GET', '/api/background')).json?.find((b) => b.name === 'bg-a');
  const faceA = (await req(BASE, 'GET', '/api/face')).json?.find((f) => f.name === 'face-a');
  const stickerA = (await req(BASE, 'GET', '/api/sticker')).json?.find((s) => s.name === 'sticker-a');

  check('history: GET without userId -> 400', (await req(BASE, 'GET', '/api/generation-history')).status, 400);
  const emptyList = await req(BASE, 'GET', '/api/generation-history?userId=e2e-user');
  check('history: GET for new user -> 200', emptyList.status, 200);
  check('history: GET for new user -> empty', emptyList.json, []);
  check('history: POST without userId -> 400', (await req(BASE, 'POST', '/api/generation-history', { body: {} })).status, 400);

  const hMin = await req(BASE, 'POST', '/api/generation-history', { body: { userId: 'e2e-user' } });
  check('history: POST minimal -> 200', hMin.status, 200);
  check(
    'history: POST minimal defaults',
    [hMin.json?.backgroundId, hMin.json?.scale, hMin.json?.dragX, hMin.json?.dragY, hMin.json?.stickers, hMin.json?.imageUrl],
    [null, 1, 0, 0, null, null]
  );
  check('history: POST response has no isAvailable', 'isAvailable' in (hMin.json ?? {}), false);

  await sleep(15); // createdAt（ミリ秒）の前後関係を確定させる
  const stickersInput = [
    { stickerId: stickerA.id, x: 10, y: 190 },
    { stickerId: stickerA.id, x: 60.5, y: 140 },
  ];
  const hFull = await req(BASE, 'POST', '/api/generation-history', {
    body: { userId: 'e2e-user', backgroundId: bgA.id, faceId: faceA.id, scale: 1.5, dragX: 3, dragY: -2, stickers: stickersInput },
  });
  check('history: POST full -> 200', hFull.status, 200);
  check('history: POST full stores ids', [hFull.json?.backgroundId, hFull.json?.faceId, hFull.json?.costumeId], [bgA.id, faceA.id, null]);
  check('history: POST full stores scale/drag', [hFull.json?.scale, hFull.json?.dragX, hFull.json?.dragY], [1.5, 3, -2]);
  check('history: POST full stickers round-trip', hFull.json?.stickers, stickersInput);

  const list1 = await req(BASE, 'GET', '/api/generation-history?userId=e2e-user');
  check('history: list has 2 items', list1.json?.length, 2);
  check('history: list is newest first', list1.json?.map((h) => h.id), [hFull.json?.id, hMin.json?.id]);
  check('history: list stickers round-trip', list1.json?.[0]?.stickers, stickersInput);
  check('history: list isAvailable for alive/null refs', list1.json?.map((h) => h.isAvailable), [true, true]);

  // isAvailable: 参照パーツが論理削除・不存在なら false。ステッカーは可用性に含めない（現行 #163 どおり）
  const tempFace = await req(BASE, 'POST', '/api/face', { token: gmToken, body: { name: 'face-temp', assetPath: '/uploads/face/temp.png' } });
  const tempSticker = await req(BASE, 'POST', '/api/sticker', { token: gmToken, body: { name: 'sticker-temp', assetPath: '/uploads/sticker/temp.png' } });
  const hMixed = await req(BASE, 'POST', '/api/generation-history', {
    body: { userId: 'e2e-user', faceId: tempFace.json?.id, stickers: [{ stickerId: tempSticker.json?.id, x: 0, y: 0 }] },
  });
  const hMissing = await req(BASE, 'POST', '/api/generation-history', { body: { userId: 'e2e-user', frontHairId: 999999 } });
  await req(BASE, 'DELETE', `/api/face/${tempFace.json?.id}`, { token: adminToken });
  await req(BASE, 'DELETE', `/api/sticker/${tempSticker.json?.id}`, { token: adminToken });
  const list2 = await req(BASE, 'GET', '/api/generation-history?userId=e2e-user');
  const mixedRow = list2.json?.find((h) => h.id === hMixed.json?.id);
  check('history: isAvailable false when a referenced part is deleted', mixedRow?.isAvailable, false);
  check('history: stickers of a deleted sticker are still returned', mixedRow?.stickers, [{ stickerId: tempSticker.json?.id, x: 0, y: 0 }]);
  check('history: isAvailable false when a referenced part does not exist', list2.json?.find((h) => h.id === hMissing.json?.id)?.isAvailable, false);

  const tempSticker2 = await req(BASE, 'POST', '/api/sticker', { token: gmToken, body: { name: 'sticker-temp2', assetPath: '/uploads/sticker/temp2.png' } });
  const hStickerOnly = await req(BASE, 'POST', '/api/generation-history', {
    body: { userId: 'e2e-user', stickers: [{ stickerId: tempSticker2.json?.id, x: 1, y: 2 }] },
  });
  await req(BASE, 'DELETE', `/api/sticker/${tempSticker2.json?.id}`, { token: adminToken });
  const list3 = await req(BASE, 'GET', '/api/generation-history?userId=e2e-user');
  check('history: deleted sticker alone does not affect isAvailable', list3.json?.find((h) => h.id === hStickerOnly.json?.id)?.isAvailable, true);

  // stickers の形式検証（現行 #168 と同じ: 不正は 400、上限100件）
  const badStickers = (stickers) => req(BASE, 'POST', '/api/generation-history', { body: { userId: 'e2e-user', stickers } });
  const badStr = await badStickers('x');
  check('history: stickers not an array -> 400', badStr.status, 400);
  check('history: stickers invalid error message', badStr.json?.error, 'Invalid stickers');
  check('history: stickerId 0 -> 400', (await badStickers([{ stickerId: 0, x: 0, y: 0 }])).status, 400);
  check('history: stickerId non-integer -> 400', (await badStickers([{ stickerId: 1.5, x: 0, y: 0 }])).status, 400);
  check('history: stickerId string -> 400', (await badStickers([{ stickerId: '1', x: 0, y: 0 }])).status, 400);
  check('history: x non-number -> 400', (await badStickers([{ stickerId: 1, x: '0', y: 0 }])).status, 400);
  check('history: 101 placements -> 400', (await badStickers(Array.from({ length: 101 }, () => ({ stickerId: 1, x: 0, y: 0 })))).status, 400);
  const h100 = await badStickers(Array.from({ length: 100 }, () => ({ stickerId: 1, x: 0, y: 0 })));
  check('history: 100 placements -> 200', h100.status, 200);
  check('history: 100 placements stored', h100.json?.stickers?.length, 100);
  const hEmptyStickers = await badStickers([]);
  check('history: empty stickers array stays []', [hEmptyStickers.status, hEmptyStickers.json?.stickers], [200, []]);

  // 削除: userId が一致しない場合は消えない（ただし応答は success）。存在しなくても success
  check('history: DELETE without userId -> 400', (await req(BASE, 'DELETE', `/api/generation-history/${hMin.json?.id}`)).status, 400);
  const delWrongUser = await req(BASE, 'DELETE', `/api/generation-history/${hMin.json?.id}?userId=other-user`);
  check('history: DELETE with wrong userId -> success (no-op)', delWrongUser.json?.success, true);
  const listAfterWrongDel = await req(BASE, 'GET', '/api/generation-history?userId=e2e-user');
  check('history: wrong-user delete keeps the row', listAfterWrongDel.json?.some((h) => h.id === hMin.json?.id), true);
  const delOk = await req(BASE, 'DELETE', `/api/generation-history/${hMin.json?.id}?userId=e2e-user`);
  check('history: DELETE -> success', delOk.json?.success, true);
  const listAfterDel = await req(BASE, 'GET', '/api/generation-history?userId=e2e-user');
  check('history: deleted row is gone', listAfterDel.json?.some((h) => h.id === hMin.json?.id), false);
  check('history: DELETE nonexistent -> success', (await req(BASE, 'DELETE', '/api/generation-history/999999?userId=e2e-user')).json?.success, true);

  // 一覧は最新100件まで（105件は seed.sql で limit-user に投入済み）
  const limitList = await req(BASE, 'GET', '/api/generation-history?userId=limit-user');
  check('history: list is capped at 100', limitList.json?.length, 100);
  check('history: cap keeps the newest', limitList.json?.[0]?.createdAt, '2026-01-01T00:00:00.104Z');

  // ---- GM 管理（システム管理者専用、全体に adminGate） ----
  check('gm: list without token -> 401', (await req(BASE, 'GET', '/api/game-masters')).status, 401);
  check('gm: list as user -> 403', (await req(BASE, 'GET', '/api/game-masters', { token: userToken })).status, 403);
  check('gm: list as game master -> 403', (await req(BASE, 'GET', '/api/game-masters', { token: gmToken })).status, 403);
  const gmList = await req(BASE, 'GET', '/api/game-masters', { token: adminToken });
  check('gm: list as system admin -> 200', gmList.status, 200);
  check('gm: list contains seeded gm', gmList.json?.map((g) => g.email), ['gm@example.com']);
  check('gm: seeded gm fields', [gmList.json?.[0]?.name, gmList.json?.[0]?.createdBy], ['GM', 'spike']);
  check('gm: createdAt is ISO 8601', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(gmList.json?.[0]?.createdAt ?? ''), true);

  check('gm: create as game master -> 403', (await req(BASE, 'POST', '/api/game-masters', { token: gmToken, body: { email: 'x@example.com' } })).status, 403);
  const gmNoEmail = await req(BASE, 'POST', '/api/game-masters', { token: adminToken, body: { name: 'x' } });
  check('gm: create without email -> 400', gmNoEmail.status, 400);
  check('gm: create without email error', gmNoEmail.json?.error, 'Email is required');

  const gmCreated = await req(BASE, 'POST', '/api/game-masters', { token: adminToken, body: { email: 'NewGM@Example.com', name: 'New GM' } });
  check('gm: create -> 201', gmCreated.status, 201);
  check('gm: create stores lowercased email', gmCreated.json?.email, 'newgm@example.com');
  check('gm: create stores name and createdBy', [gmCreated.json?.name, gmCreated.json?.createdBy], ['New GM', 'admin@example.com']);
  const newGmId = gmCreated.json?.id;

  const gmDup = await req(BASE, 'POST', '/api/game-masters', { token: adminToken, body: { email: 'NEWGM@example.com' } });
  check('gm: duplicate (different case) -> 409', gmDup.status, 409);
  check('gm: duplicate error', gmDup.json?.error, 'This user is already a game master');
  check('gm: duplicate of seeded gm (different case) -> 409', (await req(BASE, 'POST', '/api/game-masters', { token: adminToken, body: { email: 'GM@example.com' } })).status, 409);

  // 登録した GM は認証で game_master になる（照合は LOWER で大小文字を区別しない）
  const newGmToken = signToken({ email: 'newgm@example.com' });
  check('gm: registered gm verifies as game_master', (await req(BASE, 'POST', '/api/auth/verify', { body: { token: newGmToken } })).json?.role, 'game_master');
  const newGmUpperToken = signToken({ email: 'NewGm@Example.com' });
  check('gm: mixed-case token email verifies as game_master', (await req(BASE, 'POST', '/api/auth/verify', { body: { token: newGmUpperToken } })).json?.role, 'game_master');

  const gmList2 = await req(BASE, 'GET', '/api/game-masters', { token: adminToken });
  check('gm: list has 2 after create', gmList2.json?.length, 2);
  check('gm: list is newest first', gmList2.json?.[0]?.email, 'newgm@example.com');

  check('gm: delete as game master -> 403', (await req(BASE, 'DELETE', `/api/game-masters/${newGmId}`, { token: gmToken })).status, 403);
  check('gm: delete missing -> 404', (await req(BASE, 'DELETE', '/api/game-masters/999999', { token: adminToken })).status, 404);
  const gmDel = await req(BASE, 'DELETE', `/api/game-masters/${newGmId}`, { token: adminToken });
  check('gm: delete -> success', [gmDel.status, gmDel.json?.success, gmDel.json?.message], [200, true, 'Game master removed successfully']);
  check('gm: delete again -> 404', (await req(BASE, 'DELETE', `/api/game-masters/${newGmId}`, { token: adminToken })).status, 404);
  check('gm: removed gm verifies as user', (await req(BASE, 'POST', '/api/auth/verify', { body: { token: newGmToken } })).json?.role, 'user');

  // adminGate: ADMIN_ENABLED=false では GM 管理も 404（認証より前に gate が効く）
  check('adminGate: gm list with ADMIN_ENABLED=false -> 404', (await req(BASE_NOADMIN, 'GET', '/api/game-masters', { token: adminToken })).status, 404);
  check('adminGate: gm create with ADMIN_ENABLED=false -> 404', (await req(BASE_NOADMIN, 'POST', '/api/game-masters', { token: adminToken, body: { email: 'x@example.com' } })).status, 404);
  check('adminGate: gm list without token and ADMIN_ENABLED=false -> 404 (gate before auth)', (await req(BASE_NOADMIN, 'GET', '/api/game-masters')).status, 404);
} finally {
  stopDev(dev);
  stopDev(devNoAdmin);
  jwksServer.close();
}

console.log(`\n== RESULT: ${passed} passed, ${failed} failed ==`);
process.exit(failed > 0 ? 1 : 0);
