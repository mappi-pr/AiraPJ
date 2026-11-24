const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const express = require('express');

// ステッカールーターのマウント配線（認証ミドルウェアの有無）を HTTP レベルで確認するテスト。
// api/index.ts と同じ構成でマウントする。
// 認証で弾かれるリクエストは DB に到達しないため、DB 接続なしで検証できる。
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';

const stickerRouter = require('../dist/routes/sticker.js').default;
const stickerUploadRouter = require('../dist/routes/sticker-upload.js').default;
const { authenticate, requireAdmin } = require('../dist/middleware/auth.js');
const { requireAdminEnabled } = require('../dist/middleware/adminGate.js');

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());
  // 公開API（閲覧のみ認証不要。変更系はルート側で認証を要求する）
  app.use('/api/sticker', stickerRouter);
  // 管理者専用API（認証＋管理者権限必要）
  app.use('/api/sticker', requireAdminEnabled, authenticate, requireAdmin, stickerUploadRouter);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('#9 sticker upload rejects unauthenticated requests with 401', async () => {
  const res = await fetch(`${baseUrl}/api/sticker/upload`, { method: 'POST' });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.match(body.error, /Unauthorized/);
});

test('#9 sticker delete rejects unauthenticated requests with 401', async () => {
  const res = await fetch(`${baseUrl}/api/sticker/1`, { method: 'DELETE' });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.match(body.error, /Unauthorized/);
});

test('#9 sticker order update rejects unauthenticated requests with 401', async () => {
  const res = await fetch(`${baseUrl}/api/sticker/1/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ direction: 'up' }),
  });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.match(body.error, /Unauthorized/);
});

test('#9 sticker update rejects unauthenticated requests with 401', async () => {
  const res = await fetch(`${baseUrl}/api/sticker/1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'renamed' }),
  });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.match(body.error, /Unauthorized/);
});
