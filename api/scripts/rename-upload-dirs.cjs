#!/usr/bin/env node
'use strict';

/**
 * アップロード先ディレクトリ名の統一（Issue #148）
 *
 * 略称だった3種別の保存ディレクトリを正式名称へ改名するための、データ移行スクリプトです。
 * コード側の保存先変更（各 *-upload.ts）だけでは既存データが表示できなくなるため、
 * このスクリプトで「実ファイルの移動」と「DB の assetPath 書き換え」を一体で実施します。
 *
 * 旧→新の対応表（この表が切り戻しの正本です）:
 *   bg  -> background        （テーブル: backgrounds）
 *   csm -> costume           （テーブル: costumes）
 *   nav -> navigationButton  （テーブル: navigation_buttons）
 *
 * 使い方:
 *   node scripts/rename-upload-dirs.cjs            旧→新へ移行
 *   node scripts/rename-upload-dirs.cjs --undo     新→旧へ切り戻し
 *   node scripts/rename-upload-dirs.cjs --dry-run  対象件数だけ表示（何も変更しない）
 *   （--undo と --dry-run は併用可）
 *
 * 前提:
 *   - 実行前に DB と uploads ディレクトリのバックアップを取ること
 *   - コード側の変更（PR）と同じタイミング（デプロイと同時）に実行すること。
 *     コードだけ先行すると新規分が新旧混在し、移行だけ先行すると旧コードが新パスを書けない
 *   - 接続先は環境変数 DB_HOST / DB_PORT / DB_USER / DB_PASS / DB_NAME で指定（既定値は DB テストと同じ）
 *   - uploads の場所は環境変数 UPLOADS_DIR で指定（未指定時は api/uploads）
 *
 * 安全性:
 *   - DB の書き換えは全テーブル分を1トランザクションで実行する
 *   - 移動先に同名ファイルが既に存在する場合は、開始前に検出して中断する（上書きしない）
 *   - DB 書き換えが失敗した場合は、移動済みファイルを元の場所へ戻す（最善努力）
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// 旧→新の対応表
const RENAMES = [
  { from: 'bg', to: 'background', table: 'backgrounds' },
  { from: 'csm', to: 'costume', table: 'costumes' },
  { from: 'nav', to: 'navigationButton', table: 'navigation_buttons' },
];

const args = new Set(process.argv.slice(2));
const undo = args.has('--undo');
const dryRun = args.has('--dry-run');
const unknown = [...args].filter((a) => a !== '--undo' && a !== '--dry-run');
if (unknown.length > 0) {
  console.error(`Unknown option(s): ${unknown.join(', ')}`);
  process.exit(1);
}

// 方向に応じて対応表を向き変える
const steps = RENAMES.map((r) =>
  undo ? { from: r.to, to: r.from, table: r.table } : { ...r }
);

function getUploadsBasePath() {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }
  return path.resolve(__dirname, '..', 'uploads');
}

async function main() {
  const uploadsBase = getUploadsBasePath();
  console.log(`Direction: ${undo ? 'UNDO (new -> old)' : 'APPLY (old -> new)'}`);
  console.log(`Uploads base: ${uploadsBase}`);
  console.log(`Dry run: ${dryRun}`);

  // --- 事前チェック：移動対象ファイルの洗い出しと衝突検出 ---
  const fileMoves = []; // { src, dest }
  for (const step of steps) {
    const srcDir = path.join(uploadsBase, step.from);
    const destDir = path.join(uploadsBase, step.to);
    if (!fs.existsSync(srcDir)) {
      console.log(`[files] ${step.from}/ : directory not found, skip`);
      continue;
    }
    for (const name of fs.readdirSync(srcDir)) {
      const src = path.join(srcDir, name);
      if (!fs.statSync(src).isFile()) continue;
      const dest = path.join(destDir, name);
      if (fs.existsSync(dest)) {
        throw new Error(`Collision: ${dest} already exists. Aborting before any change.`);
      }
      fileMoves.push({ src, dest });
    }
  }
  console.log(`[files] ${fileMoves.length} file(s) to move`);

  // --- DB の対象件数を先に数える ---
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'airapj',
  });
  await client.connect();
  try {
    const counts = [];
    for (const step of steps) {
      const res = await client.query(
        `SELECT COUNT(*)::int AS n FROM "${step.table}" WHERE "assetPath" LIKE $1`,
        [`/uploads/${step.from}/%`]
      );
      counts.push({ ...step, n: res.rows[0].n });
      console.log(`[db] ${step.table}: ${res.rows[0].n} row(s) with /uploads/${step.from}/...`);
    }

    if (dryRun) {
      console.log('Dry run: no changes made.');
      return;
    }

    // --- ファイル移動 ---
    const moved = [];
    try {
      for (const move of fileMoves) {
        fs.mkdirSync(path.dirname(move.dest), { recursive: true });
        fs.renameSync(move.src, move.dest);
        moved.push(move);
      }
      console.log(`[files] moved ${moved.length} file(s)`);

      // --- DB 書き換え（全テーブルを1トランザクション） ---
      await client.query('BEGIN');
      for (const step of counts) {
        const res = await client.query(
          `UPDATE "${step.table}" SET "assetPath" = REPLACE("assetPath", $1, $2) WHERE "assetPath" LIKE $3`,
          [`/uploads/${step.from}/`, `/uploads/${step.to}/`, `/uploads/${step.from}/%`]
        );
        console.log(`[db] ${step.table}: updated ${res.rowCount} row(s)`);
      }
      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      // 移動済みファイルを元に戻す（最善努力）
      for (const move of moved.reverse()) {
        try {
          fs.mkdirSync(path.dirname(move.src), { recursive: true });
          fs.renameSync(move.dest, move.src);
        } catch (rollbackErr) {
          console.error(`[files] rollback failed for ${move.dest}: ${rollbackErr.message}`);
        }
      }
      throw err;
    }
    console.log('Done.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
});
