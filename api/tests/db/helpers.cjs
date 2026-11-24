'use strict';

// DBテスト共通のセットアップ（Issue #131）。
//
// 使い方: DBテストのファイルは、dist 配下のモジュールを require する前に
// 必ずこのモジュールを require すること。
// （api/models/sequelize.ts は require 時点の DB_NAME で接続先を決めるため、
//   ここで DB_NAME をテスト用DB名に切り替えておく必要がある）

const { Client } = require('pg');

const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME } = process.env;

// テスト用DB名は config/config.js の test 環境の流儀に合わせ `${DB_NAME}_test`。
// 本番・開発用DB（DB_NAME 本体）には一切触れない。
const baseDbName = DB_NAME || 'airapj';
const testDbName = `${baseDbName}_test`;

if (!/^[A-Za-z0-9_]+$/.test(testDbName)) {
  throw new Error(`Invalid test database name: ${testDbName}`);
}

process.env.DB_NAME = testDbName;

const connection = {
  host: DB_HOST || 'localhost',
  port: Number(DB_PORT) || 5432,
  user: DB_USER || 'postgres',
};
connection['password'] = DB_PASS || '';

// テスト用DBが無ければ作成する（接続先は管理用DB "postgres"）。
async function ensureTestDatabase() {
  const client = new Client({ ...connection, database: 'postgres' });
  await client.connect();
  try {
    const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [testDbName]);
    if (result.rowCount === 0) {
      // 識別子はパラメータ化できないため、検証済みの名前を引用して埋め込む
      await client.query(`CREATE DATABASE "${testDbName}"`);
    }
  } finally {
    await client.end();
  }
}

// 全モデルを登録したうえで sequelize インスタンスとモデルを返す。
// sync() は登録済みモデルしか作らないため、モデルモジュールを一通り読み込む。
function loadModels() {
  const modelsIndex = require('../../dist/models/index.js');
  const { Face } = require('../../dist/models/face.js');
  const { FrontHair } = require('../../dist/models/frontHair.js');
  const { BackHair } = require('../../dist/models/backHair.js');
  return {
    sequelize: modelsIndex.sequelize,
    Face,
    FrontHair,
    BackHair,
    Background: modelsIndex.Background,
    Costume: modelsIndex.Costume,
    GameMaster: modelsIndex.GameMaster,
  };
}

// テスト用DB専用: 全テーブルを作り直して最新スキーマに揃える。
// 新規DBはマイグレーションではなく sequelize.sync() で作成するのが
// このリポジトリの正式な運用（doc/DEVELOPMENT.md 参照。アプリ起動時も sync）。
async function resetSchema(sequelize) {
  await sequelize.sync({ force: true });
}

module.exports = { testDbName, ensureTestDatabase, loadModels, resetSchema };
