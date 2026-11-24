'use strict';

// DBテスト: 疑似認証と保護ルートの検証（Issue #131 / #149 の回帰検証）。
//
// ログインから保護ルートの利用まで、本物の経路を通して検証する:
//   1. POST /api/auth/verify にテスト用トークンを送ってログインする
//      （Google の検証だけ fakeGoogleAuth.cjs で差し替え、
//        ロール解決・応答は実装そのまま）
//   2. 以後のリクエストは、そのトークンを Authorization: Bearer で送る
//      （本実装はステートレスで、トークン自体がセッションを兼ねる）
//   3. #149 で認証を足した保護ルートについて、
//      未認証 401 / 一般ユーザー 403 / 管理者 200 を確認する
//
// ロールの再現方法:
//   - システム管理者: SYSTEM_ADMIN_EMAILS にテスト用メールを登録（fakeGoogleAuth が設定）
//   - ゲームマスター: GameMaster テーブルにテスト用メールを seed する
//   - 一般ユーザー: どちらの条件にも当てはまらないテスト用メール

const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const express = require('express');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-client-id';
// アップロード先を一時ディレクトリに逃がす（リポジトリ内にファイルを残さない）。
process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'airapj-db-test-uploads-'));

// DB_NAME の切り替えと疑似認証の準備は、dist の読み込み前に済ませる。
const helpers = require('./helpers.cjs');
const { installFakeGoogleAuth, TEST_USERS } = require('./fakeGoogleAuth.cjs');
installFakeGoogleAuth();
const { seedFrontHairs } = require('./seed.cjs');

const { authenticate, requireAdmin } = require('../../dist/middleware/auth.js');
const { requireAdminEnabled } = require('../../dist/middleware/adminGate.js');
const authRouter = require('../../dist/routes/auth.js').default;
const frontHairRouter = require('../../dist/routes/frontHair.js').default;
const frontHairUploadRouter = require('../../dist/routes/frontHair-upload.js').default;
const { sequelize, FrontHair, GameMaster } = helpers.loadModels();

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

// 1x1 の透過 PNG
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAwMCAO+ip1sAAAAASUVORK5CYII=',
  'base64'
);

let server;
let baseUrl;

before(async () => {
  await helpers.ensureTestDatabase();
  await helpers.resetSchema(sequelize);
  // ゲームマスターは DB 照合で解決されるため、テスト用メールを seed する。
  await GameMaster.create({
    email: TEST_USERS.gameMaster.payload.email,
    name: TEST_USERS.gameMaster.payload.name,
  });
  const app = express();
  app.use(express.json());
  // マウント構成は api/index.ts と同じ（アップロード系は管理者必須で二重マウント）。
  app.use('/api/auth', authRouter);
  app.use('/api/front-hair', frontHairRouter);
  app.use('/api/front-hair', requireAdminEnabled, authenticate, requireAdmin, frontHairUploadRouter);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await sequelize.close();
  fs.rmSync(process.env.UPLOADS_DIR, { recursive: true, force: true });
});

// 本物のログインエンドポイントでトークンを検証し、セッション情報を得る。
async function login(token) {
  const res = await fetch(`${baseUrl}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return { status: res.status, body: await res.json() };
}

test('ログイン（/api/auth/verify）で各ロールが解決される', async () => {
  const admin = await login(TEST_USERS.admin.token);
  assert.equal(admin.status, 200);
  assert.equal(admin.body.email, TEST_USERS.admin.payload.email);
  assert.equal(admin.body.role, 'system_admin');
  assert.equal(admin.body.isAdmin, true);

  const gameMaster = await login(TEST_USERS.gameMaster.token);
  assert.equal(gameMaster.status, 200);
  assert.equal(gameMaster.body.role, 'game_master');
  assert.equal(gameMaster.body.isAdmin, true);

  const user = await login(TEST_USERS.user.token);
  assert.equal(user.status, 200);
  assert.equal(user.body.role, 'user');
  assert.equal(user.body.isAdmin, false);

  const invalid = await login('not-a-real-token');
  assert.equal(invalid.status, 401);

  const missing = await fetch(`${baseUrl}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(missing.status, 400);
});

test('保護ルート（並び替えPUT）は未認証401・一般403・管理者200（#149）', async () => {
  const created = await seedFrontHairs(FrontHair, [
    { name: 'front-A', sortOrder: 1 },
    { name: 'front-B', sortOrder: 2 },
  ]);
  const b = created[1];
  const url = `${baseUrl}/api/front-hair/${b.id}/order`;
  const options = (headers) => ({
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ direction: 'up' }),
  });

  const unauthenticated = await fetch(url, options({}));
  assert.equal(unauthenticated.status, 401);

  const { body: session } = await login(TEST_USERS.user.token);
  assert.equal(session.role, 'user');
  const forbidden = await fetch(url, options(bearer(TEST_USERS.user.token)));
  assert.equal(forbidden.status, 403);

  const ok = await fetch(url, options(bearer(TEST_USERS.admin.token)));
  assert.equal(ok.status, 200);

  // 実際に並び替わっていること（B が先頭へ）まで確認する。
  const rows = await FrontHair.findAll({ order: [['id', 'ASC']] });
  const byName = Object.fromEntries(rows.map((row) => [row.name, row.sortOrder]));
  assert.equal(byName['front-B'], 1);
  assert.equal(byName['front-A'], 2);
});

test('保護ルート（アップロードPOST）は未認証401・一般403・管理者200（#149）', async () => {
  const url = `${baseUrl}/api/front-hair/upload`;
  const makeForm = () => {
    const form = new FormData();
    form.append('name', 'uploaded-by-db-test');
    form.append('asset', new Blob([PNG_1X1], { type: 'image/png' }), 'pixel.png');
    return form;
  };

  const unauthenticated = await fetch(url, { method: 'POST', body: makeForm() });
  assert.equal(unauthenticated.status, 401);

  const forbidden = await fetch(url, {
    method: 'POST',
    headers: bearer(TEST_USERS.user.token),
    body: makeForm(),
  });
  assert.equal(forbidden.status, 403);

  const ok = await fetch(url, {
    method: 'POST',
    headers: bearer(TEST_USERS.admin.token),
    body: makeForm(),
  });
  assert.equal(ok.status, 200);
  const created = await ok.json();
  assert.equal(created.name, 'uploaded-by-db-test');

  // DB に行ができ、実ファイルも保存されている。
  const row = await FrontHair.findByPk(created.id);
  assert.ok(row);
  const savedFile = path.join(
    process.env.UPLOADS_DIR,
    'frontHair',
    path.basename(created.assetPath)
  );
  assert.ok(fs.existsSync(savedFile));
});
