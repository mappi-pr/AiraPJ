'use strict';

// DBテスト: ゲームマスターの email 照合が大文字小文字を区別しないこと（Issue #148）。
//
// DB に大文字混じりで登録されたメールアドレスでも、トークン側の表記
// （通常は小文字）と一致してゲームマスターと判定されることを実DBで検証する。

const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';

const helpers = require('./helpers.cjs');
const { sequelize, GameMaster } = helpers.loadModels();
const { isGameMaster } = require('../../dist/middleware/auth.js');

before(async () => {
  await helpers.ensureTestDatabase();
  await helpers.resetSchema(sequelize);
});

after(async () => {
  await sequelize.close();
});

test('game master email matching is case-insensitive', async () => {
  await GameMaster.create({
    email: 'Master@Example.com',
    name: 'gm',
    createdBy: 'root@example.com',
  });

  assert.equal(await isGameMaster('master@example.com'), true);
  assert.equal(await isGameMaster('MASTER@EXAMPLE.COM'), true);
  assert.equal(await isGameMaster('nobody@example.com'), false);
  assert.equal(await isGameMaster(undefined), false);
});
