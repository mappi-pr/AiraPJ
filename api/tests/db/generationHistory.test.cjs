'use strict';

// DBテスト: GET /api/generation-history の isAvailable 一括判定（Issue #148 の N+1 解消・案A）。
//
// 以前はフロント（History.tsx）が履歴1件ごとに5リソースへ個別リクエストして
// 削除済みかどうかを判定していた。サーバ側で IN 句により一括判定し、
// レスポンスの isAvailable に含める形に変更したため、その判定を実DBで検証する。

const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const express = require('express');

const helpers = require('./helpers.cjs');

const generationHistoryRouter = require('../../dist/routes/generation-history.js').default;
const { sequelize, Background } = helpers.loadModels();
const GenerationHistory = sequelize.models.GenerationHistory;

let server;
let baseUrl;

before(async () => {
  await helpers.ensureTestDatabase();
  await helpers.resetSchema(sequelize);
  const app = express();
  app.use(express.json());
  app.use('/api/generation-history', generationHistoryRouter);
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

test('isAvailable reflects whether all referenced parts still exist', async () => {
  const alive = await Background.create({
    name: 'alive-bg',
    assetPath: '/uploads/background/alive.png',
    deleted: false,
  });
  const deleted = await Background.create({
    name: 'deleted-bg',
    assetPath: '/uploads/background/deleted.png',
    deleted: true,
    deletedAt: new Date(),
  });

  const userId = 'history-test-user';
  const base = { userId, costumeId: null, backHairId: null, faceId: null, frontHairId: null };
  await GenerationHistory.create({ ...base, backgroundId: alive.id });
  await GenerationHistory.create({ ...base, backgroundId: deleted.id });
  await GenerationHistory.create({ ...base, backgroundId: 999999 });
  await GenerationHistory.create({ ...base, backgroundId: null });

  const response = await fetch(`${baseUrl}/api/generation-history?userId=${userId}`);
  assert.equal(response.status, 200);
  const histories = await response.json();
  assert.equal(histories.length, 4);

  const byBackgroundId = new Map(histories.map(h => [h.backgroundId, h.isAvailable]));
  assert.equal(byBackgroundId.get(alive.id), true);
  assert.equal(byBackgroundId.get(deleted.id), false);
  assert.equal(byBackgroundId.get(999999), false);
  assert.equal(byBackgroundId.get(null), true);
});
