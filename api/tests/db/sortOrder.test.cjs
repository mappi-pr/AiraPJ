'use strict';

// DBテスト: 論理削除と sortOrder の整合（Issue #117 の回帰検証 / Issue #131 で整備）。
//
// 実際のルーターを express にマウントし、HTTP 経由で実DBを検証する。
// 認証は本物の経路を通す（fakeGoogleAuth.cjs 参照）:
// Google のトークン検証だけをテスト用に差し替え、
// authenticate / ロール解決 / requireAdmin は実装そのままで動かす。
// 管理者操作は、テスト用管理者トークンを Bearer として送って行う。

const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const express = require('express');

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';

// DB_NAME の切り替えと疑似認証の準備は、dist の読み込み前に済ませる。
const helpers = require('./helpers.cjs');
const { installFakeGoogleAuth, TEST_USERS } = require('./fakeGoogleAuth.cjs');
installFakeGoogleAuth();
const { seedFaces, cleanLineRows, legacySandwichRows } = require('./seed.cjs');

const faceRouter = require('../../dist/routes/face.js').default;
const { sequelize, Face } = helpers.loadModels();

const adminHeaders = { Authorization: `Bearer ${TEST_USERS.admin.token}` };

let server;
let baseUrl;

before(async () => {
  await helpers.ensureTestDatabase();
  await helpers.resetSchema(sequelize);
  const app = express();
  app.use(express.json());
  app.use('/api/face', faceRouter);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await sequelize.close();
});

async function listFaces() {
  const res = await fetch(`${baseUrl}/api/face`);
  assert.equal(res.status, 200);
  return res.json();
}

async function putOrder(id, direction) {
  const res = await fetch(`${baseUrl}/api/face/${id}/order`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...adminHeaders },
    body: JSON.stringify({ direction }),
  });
  assert.equal(res.status, 200);
  return res.json();
}

// 削除済みを含む全行を id 順で取得し、プレーンオブジェクトで返す。
async function allRowsById() {
  const rows = await Face.findAll({ order: [['id', 'ASC']] });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    deleted: row.deleted,
    sortOrder: row.sortOrder,
  }));
}

test('削除済みを挟んだレガシー状態でも一覧と並び替えが正しく動く', async () => {
  const [, b] = await seedFaces(Face, legacySandwichRows());

  // 一覧には未削除だけが sortOrder 順で返る（歯抜けがあっても順序は決定的）。
  const listed = await listFaces();
  assert.deepEqual(
    listed.map((face) => face.name),
    ['face-A', 'face-B', 'face-D', 'face-E']
  );

  // B を down: 削除済みの C を飛ばして、隣の未削除 D と入れ替わる。
  await putOrder(b.id, 'down');

  const byName = Object.fromEntries((await allRowsById()).map((row) => [row.name, row]));
  assert.equal(byName['face-B'].sortOrder, 4);
  assert.equal(byName['face-D'].sortOrder, 2);
  // 削除済みの C は手つかず（削除済みのまま、sortOrder も保持）。
  assert.equal(byName['face-C'].deleted, true);
  assert.equal(byName['face-C'].sortOrder, 3);

  const listedAfter = await listFaces();
  assert.deepEqual(
    listedAfter.map((face) => face.name),
    ['face-A', 'face-D', 'face-B', 'face-E']
  );
});

test('論理削除で後続の sortOrder が詰め直され、削除後も並び替えできる（#117）', async () => {
  const created = await seedFaces(Face, cleanLineRows());
  const target = created[2]; // face-C, sortOrder=3

  const res = await fetch(`${baseUrl}/api/face/${target.id}`, {
    method: 'DELETE',
    headers: { ...adminHeaders },
  });
  assert.equal(res.status, 200);

  const rows = await allRowsById();
  const active = rows.filter((row) => !row.deleted);
  // 未削除は相対順序を保ったまま 1..4 の連番に詰め直される。
  assert.deepEqual(
    active.map((row) => row.name),
    ['face-A', 'face-B', 'face-D', 'face-E']
  );
  assert.deepEqual(
    active.map((row) => row.sortOrder),
    [1, 2, 3, 4]
  );
  // 削除済み行は sortOrder が値域外の 0 にリセットされる。
  const deletedRow = rows.find((row) => row.id === target.id);
  assert.equal(deletedRow.deleted, true);
  assert.equal(deletedRow.sortOrder, 0);

  // 削除後の並び替え: D を up で B と入れ替わり、連番は崩れない。
  const d = active.find((row) => row.name === 'face-D');
  await putOrder(d.id, 'up');

  const rowsAfter = await allRowsById();
  const activeAfter = rowsAfter.filter((row) => !row.deleted);
  assert.deepEqual(
    activeAfter.map((row) => row.sortOrder).sort((x, y) => x - y),
    [1, 2, 3, 4]
  );
  const listedAfter = await listFaces();
  assert.deepEqual(
    listedAfter.map((face) => face.name),
    ['face-A', 'face-D', 'face-B', 'face-E']
  );
});
