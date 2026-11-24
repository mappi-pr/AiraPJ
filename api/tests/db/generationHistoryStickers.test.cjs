'use strict';

// DBテスト: 生成履歴へのステッカー配置の保存と復元（Issue #165）。
//
// PR #160 のステッカー配置は生成履歴に残らず、履歴から再表示しても復元されなかった。
// generation_histories に stickers（JSON）として配置（ID・位置・重なり順）を保存し、
// GET でそのまま返すことを実DBで検証する。
// 削除済みステッカーの配置スキップはフロント（History.tsx）が
// GET /api/sticker/:id の 404 を見て行うため、その前提もここで確認する。

const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const express = require('express');

const helpers = require('./helpers.cjs');

// Sticker モデルは models/index 経由では読み込まれないため、
// sync の対象に含めるには明示的に require して登録しておく必要がある。
require('../../dist/models/sticker.js');
const generationHistoryRouter = require('../../dist/routes/generation-history.js').default;
const stickerRouter = require('../../dist/routes/sticker.js').default;
const { sequelize } = helpers.loadModels();
const GenerationHistory = sequelize.models.GenerationHistory;
const Sticker = sequelize.models.Sticker;

let server;
let baseUrl;

before(async () => {
  await helpers.ensureTestDatabase();
  await helpers.resetSchema(sequelize);
  const app = express();
  app.use(express.json());
  app.use('/api/generation-history', generationHistoryRouter);
  app.use('/api/sticker', stickerRouter);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await sequelize.close();
});

async function createSticker(name) {
  return Sticker.create({ name, assetPath: `/uploads/sticker/${name}.png`, deleted: false });
}

async function postHistory(body) {
  return fetch(`${baseUrl}/api/generation-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function fetchHistories(userId) {
  const response = await fetch(`${baseUrl}/api/generation-history?userId=${userId}`);
  assert.equal(response.status, 200);
  return response.json();
}

test('sticker placements are saved and returned in order (round trip)', async () => {
  const first = await createSticker('roundtrip-first');
  const second = await createSticker('roundtrip-second');
  const userId = 'sticker-roundtrip-user';

  // 同じステッカーの複数枚配置と、配列順＝重なり順が保たれることを確認する
  const placements = [
    { stickerId: second.id, x: 10, y: 20 },
    { stickerId: first.id, x: 30.5, y: 40.25 },
    { stickerId: second.id, x: 50, y: 60 },
  ];

  const postResponse = await postHistory({ userId, stickers: placements });
  assert.equal(postResponse.status, 200);
  const created = await postResponse.json();
  assert.deepEqual(created.stickers, placements);

  const histories = await fetchHistories(userId);
  assert.equal(histories.length, 1);
  assert.deepEqual(histories[0].stickers, placements);
});

test('history without sticker placements stays compatible (null, available)', async () => {
  const userId = 'sticker-compat-user';

  const postResponse = await postHistory({ userId });
  assert.equal(postResponse.status, 200);

  const histories = await fetchHistories(userId);
  assert.equal(histories.length, 1);
  // 配置情報のない履歴は stickers が null のままで、従来どおり表示対象になる
  assert.equal(histories[0].stickers, null);
  assert.equal(histories[0].isAvailable, true);

  // DBに直接作った配置なし履歴（移行前の既存データ相当）も同じ扱いになる
  await GenerationHistory.create({ userId, backgroundId: null });
  const afterDirect = await fetchHistories(userId);
  assert.equal(afterDirect.length, 2);
  assert.ok(afterDirect.every(h => h.stickers === null || h.stickers === undefined));
});

test('placement of a logically deleted sticker: history keeps it, sticker fetch 404s', async () => {
  const sticker = await createSticker('to-be-deleted');
  const userId = 'sticker-deleted-user';
  const placements = [{ stickerId: sticker.id, x: 1, y: 2 }];

  const postResponse = await postHistory({ userId, stickers: placements });
  assert.equal(postResponse.status, 200);

  // 配置後にステッカーが論理削除された状態を作る
  await sticker.update({ deleted: true, deletedAt: new Date() });

  // 復元側（フロント）はこの 404 を見て、その配置だけをスキップする
  const stickerResponse = await fetch(`${baseUrl}/api/sticker/${sticker.id}`);
  assert.equal(stickerResponse.status, 404);

  // 履歴自体は配置情報を保持したまま返り、可用性判定にも影響しない
  // （ステッカーが消えても履歴そのものは表示できる）
  const histories = await fetchHistories(userId);
  assert.equal(histories.length, 1);
  assert.deepEqual(histories[0].stickers, placements);
  assert.equal(histories[0].isAvailable, true);
});

test('malformed sticker placements are rejected with 400', async () => {
  const userId = 'sticker-invalid-user';

  for (const stickers of [
    'not-an-array',
    [{ x: 1, y: 2 }],
    [{ stickerId: 1, x: 'left', y: 2 }],
    [{ stickerId: -1, x: 1, y: 2 }],
  ]) {
    const response = await postHistory({ userId, stickers });
    assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(stickers)}`);
  }

  const histories = await fetchHistories(userId);
  assert.equal(histories.length, 0);
});
