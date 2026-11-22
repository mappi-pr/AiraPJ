const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const express = require('express');

// ルーターのマウント配線（認証ミドルウェアの有無）を HTTP レベルで確認するテスト。
// 認証で弾かれるリクエストは DB に到達しないため、DB 接続なしで検証できる。
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';

const frontHairRouter = require('../dist/routes/frontHair.js').default;
const favoriteRouter = require('../dist/routes/favorite.js').default;

let server;
let baseUrl;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/front-hair', frontHairRouter);
  app.use('/api/favorite', favoriteRouter);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('#137 front-hair PUT /:id/order rejects unauthenticated requests with 401', async () => {
  const res = await fetch(`${baseUrl}/api/front-hair/1/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ direction: 'up' }),
  });
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.match(body.error, /Unauthorized/);
});

test('#144 favorite DELETE requires userId', async () => {
  const res = await fetch(`${baseUrl}/api/favorite/1`, { method: 'DELETE' });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'userId required');
});
