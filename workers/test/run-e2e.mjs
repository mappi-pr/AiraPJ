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
  const child = spawn(
    'npx',
    ['wrangler', 'dev', '--port', String(port), '--var', `GOOGLE_JWKS_URL:http://127.0.0.1:${JWKS_PORT}/jwks.json`, ...extraVars],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  child.stderr.on('data', (d) => process.stderr.write(`[wrangler:${port}] ${d}`));
  return child;
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

  // ADMIN_ENABLED=false のとき管理系は 404（現行 adminGate と同じ）
  check('adminGate: create with ADMIN_ENABLED=false -> 404', (await req(BASE_NOADMIN, 'POST', '/api/background', { token: adminToken, body: { name: 'x', assetPath: '/uploads/bg/x.png' } })).status, 404);
  check('adminGate: list still 200 with ADMIN_ENABLED=false', (await req(BASE_NOADMIN, 'GET', '/api/background')).status, 200);
} finally {
  dev.kill('SIGTERM');
  devNoAdmin.kill('SIGTERM');
  jwksServer.close();
}

console.log(`\n== RESULT: ${passed} passed, ${failed} failed ==`);
process.exit(failed > 0 ? 1 : 0);
