#!/usr/bin/env node
/**
 * pg-to-d1.mjs — PostgreSQL ダンプを D1 用データ SQL に変換する（#166 No.4 移行リハーサルキット）
 *
 * 使い方:
 *   pg_dump --data-only --no-owner --no-privileges <DB名> > dump.sql
 *   node pg-to-d1.mjs dump.sql [--out out]
 *
 * 入力: pg_dump の plain 形式（COPY 形式、または --inserts / --column-inserts の INSERT 形式）
 * 出力（--out ディレクトリ、既定は ./out）:
 *   d1-data.sql        D1 マイグレーション 0001〜0006 適用済みの DB に流すデータ INSERT 文
 *   r2-copy-plan.json  uploads 実ファイル → R2 キーのコピー対応表
 *   report.json        変換レポート（件数・重複解消・assetPath 書き換え）
 *   report.md          同上の人間可読版（標準出力にも表示）
 *
 * 変換規則（スパイクの型変換原則どおり）:
 *   BOOLEAN -> INTEGER (0/1), TIMESTAMP -> TEXT (ISO 8601, UTC, ミリ秒),
 *   SERIAL の id はそのまま引き継ぐ（D1 側 AUTOINCREMENT は明示 id 投入で追随する）
 *
 * 移行固有の処理:
 *   1. assetPath の旧ディレクトリ名（bg/csm/nav）を正式名称へ書き換える
 *      （PR #169 の rename-upload-dirs と同じ対応。本番が改名スクリプト未適用でも変換時に吸収する）
 *   2. パーツ系テーブルの有効行 sortOrder 重複を検出し、(sortOrder, id) 順で 1..N に振り直す
 *      （D1 マイグレーション 0002/0004 の部分一意インデックスが失敗しないため）
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// D1 側の列定義（マイグレーション 0001〜0006 の列順に合わせる）
// pgCols: PG 側の列名（Sequelize の列名そのまま。game_masters だけ snake_case）
const TABLES = {
  backgrounds: {
    cols: ['id', 'name', 'assetPath', 'deleted', 'deletedAt', 'sortOrder', 'offsetX', 'offsetY', 'width', 'height'],
    bool: ['deleted'], ts: ['deletedAt'], asset: true, parts: true,
  },
  faces: {
    cols: ['id', 'name', 'assetPath', 'deleted', 'deletedAt', 'sortOrder', 'offsetX', 'offsetY', 'width', 'height'],
    bool: ['deleted'], ts: ['deletedAt'], asset: true, parts: true,
  },
  front_hairs: {
    cols: ['id', 'name', 'assetPath', 'deleted', 'deletedAt', 'sortOrder', 'offsetX', 'offsetY', 'width', 'height'],
    bool: ['deleted'], ts: ['deletedAt'], asset: true, parts: true,
  },
  back_hairs: {
    cols: ['id', 'name', 'assetPath', 'deleted', 'deletedAt', 'sortOrder', 'offsetX', 'offsetY', 'width', 'height'],
    bool: ['deleted'], ts: ['deletedAt'], asset: true, parts: true,
  },
  costumes: {
    cols: ['id', 'name', 'assetPath', 'deleted', 'deletedAt', 'sortOrder', 'offsetX', 'offsetY', 'width', 'height'],
    bool: ['deleted'], ts: ['deletedAt'], asset: true, parts: true,
  },
  stickers: {
    cols: ['id', 'name', 'assetPath', 'deleted', 'deletedAt', 'sortOrder', 'offsetX', 'offsetY', 'width', 'height'],
    bool: ['deleted'], ts: ['deletedAt'], asset: true, parts: true,
  },
  navigation_buttons: {
    cols: ['id', 'buttonType', 'assetPath'],
    asset: true,
  },
  game_masters: {
    cols: ['id', 'email', 'name', 'created_at', 'created_by'],
    ts: ['created_at'],
  },
  users: {
    cols: ['id', 'createdAt'],
    ts: ['createdAt'],
    textId: true, // users.id は UUID 文字列が主キー（他テーブルの整数 id と違う）
  },
  generation_histories: {
    cols: ['id', 'userId', 'backgroundId', 'costumeId', 'backHairId', 'faceId', 'frontHairId', 'scale', 'dragX', 'dragY', 'stickers', 'imageUrl', 'createdAt'],
    ts: ['createdAt'], json: ['stickers'],
  },
  favorites: {
    cols: ['id', 'userId', 'costumeId'],
  },
};

// PR #169 の RENAMES と同じ対応（旧 -> 正式名称）
const RENAMES = { bg: 'background', csm: 'costume', nav: 'navigationButton' };

// ---------- pg_dump のパース ----------

// COPY 形式の1フィールドをデコードする。\N は呼び出し側で NULL 判定済み。
function decodeCopyField(s) {
  return s.replace(/\\(.)/g, (_, c) => {
    switch (c) {
      case 'n': return '\n';
      case 't': return '\t';
      case 'r': return '\r';
      case 'b': return '\b';
      case 'f': return '\f';
      case 'v': return '\v';
      case '\\': return '\\';
      default: return c;
    }
  });
}

// INSERT 文の VALUES タプル列を走査して値トークンに分解する
function parseInsertValues(text, startIdx) {
  const rows = [];
  let i = startIdx;
  const skipWs = () => { while (i < text.length && /\s/.test(text[i])) i++; };
  skipWs();
  while (text[i] === '(') {
    i++;
    const row = [];
    for (;;) {
      skipWs();
      if (text[i] === "'") {
        // 文字列リテラル（'' エスケープ）
        let j = i + 1, out = '';
        for (;;) {
          if (text[j] === "'" && text[j + 1] === "'") { out += "'"; j += 2; }
          else if (text[j] === "'") { j++; break; }
          else { out += text[j]; j++; }
        }
        row.push({ kind: 'str', value: out });
        i = j;
      } else {
        let j = i;
        while (j < text.length && text[j] !== ',' && text[j] !== ')') j++;
        const tok = text.slice(i, j).trim();
        if (/^NULL$/i.test(tok)) row.push({ kind: 'null', value: null });
        else if (/^true$/i.test(tok)) row.push({ kind: 'bool', value: true });
        else if (/^false$/i.test(tok)) row.push({ kind: 'bool', value: false });
        else row.push({ kind: 'num', value: tok });
        i = j;
      }
      skipWs();
      if (text[i] === ',') { i++; continue; }
      if (text[i] === ')') { i++; break; }
      throw new Error(`INSERT VALUES の解析に失敗: 周辺テキスト: ${text.slice(i, i + 40)}`);
    }
    rows.push(row);
    skipWs();
    if (text[i] === ',') { i++; skipWs(); continue; }
    break;
  }
  return rows;
}

function parseDump(sql) {
  const data = {}; // table -> { cols: [...], rows: [ {col: {kind, value}} ] }
  const copyTables = new Set(); // COPY で拾えたテーブル（INSERT 側では二重に拾わない）
  const lines = sql.split('\n');

  const ensure = (table, cols) => {
    if (!data[table]) data[table] = { cols, rows: [] };
    return data[table];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // COPY public.backgrounds (id, name, ...) FROM stdin;
    const copyMatch = line.match(/^COPY\s+(?:[\w"]+\.)?"?(\w+)"?\s*\(([^)]+)\)\s+FROM stdin;/);
    if (copyMatch) {
      const table = copyMatch[1];
      const cols = copyMatch[2].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const entry = ensure(table, cols);
      copyTables.add(table);
      i++;
      while (i < lines.length && lines[i] !== '\\.') {
        const raw = lines[i];
        i++;
        if (raw === '') continue;
        const fields = raw.split('\t');
        const row = {};
        cols.forEach((col, idx) => {
          const f = fields[idx];
          if (f === undefined || f === '\\N') row[col] = { kind: 'null', value: null };
          else row[col] = { kind: 'raw', value: decodeCopyField(f) };
        });
        entry.rows.push(row);
      }
      i++; // skip \.
      continue;
    }
    i++;
  }

  // INSERT 形式（--inserts / --column-inserts）。COPY で拾えたテーブルは対象外にする。
  const insertRe = /INSERT INTO\s+(?:[\w"]+\.)?"?(\w+)"?\s*(?:\(([^)]+)\))?\s*VALUES\s*/g;
  let m;
  while ((m = insertRe.exec(sql)) !== null) {
    const table = m[1];
    if (copyTables.has(table)) continue;
    if (!TABLES[table]) continue;
    const cols = m[2]
      ? m[2].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      : TABLES[table].cols;
    const entry = ensure(table, cols);
    const rows = parseInsertValues(sql, insertRe.lastIndex);
    for (const r of rows) {
      const row = {};
      cols.forEach((col, idx) => { row[col] = r[idx] ?? { kind: 'null', value: null }; });
      entry.rows.push(row);
    }
  }
  return data;
}

// ---------- 値変換 ----------

// PG の timestamp 表記 -> ISO 8601 (UTC, ミリ秒)。オフセット付きは UTC へ換算、
// オフセットなしは UTC として扱う（本番 PG は UTC 前提。README 参照）。
function toIso8601(v) {
  const m = String(v).trim().match(
    /^(\d{4}-\d{2}-\d{2})[ ](\d{2}:\d{2}:\d{2})(?:\.(\d+))?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/
  );
  if (!m) throw new Error(`timestamp の形式を解釈できません: ${v}`);
  const [, date, time, frac = '', tz] = m;
  const ms = (frac + '000').slice(0, 3);
  let offset = '+00:00';
  if (tz && tz !== 'Z') {
    const sign = tz[0];
    const digits = tz.slice(1).replace(':', '');
    offset = `${sign}${digits.padEnd(4, '0').slice(0, 2)}:${digits.padEnd(4, '0').slice(2, 4)}`;
  }
  const d = new Date(`${date}T${time}.${ms}${offset}`);
  if (Number.isNaN(d.getTime())) throw new Error(`timestamp を変換できません: ${v}`);
  return d.toISOString();
}

function sqlLiteral(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

// 生の行（{col: {kind, value}}）を D1 の値（JS 値）へ変換する
function convertRow(table, spec, row) {
  const out = {};
  for (const col of spec.cols) {
    const cell = row[col];
    if (!cell || cell.kind === 'null') { out[col] = null; continue; }
    if (spec.bool?.includes(col)) {
      if (cell.kind === 'bool') out[col] = cell.value ? 1 : 0;
      else out[col] = (cell.value === 't' || cell.value === 'true' || cell.value === '1') ? 1 : 0;
      continue;
    }
    if (spec.ts?.includes(col)) { out[col] = toIso8601(cell.value); continue; }
    if (spec.json?.includes(col)) {
      // JSON として妥当なことだけ確認し、文字列のまま保持する（D1 側も JSON 文字列カラム）
      JSON.parse(cell.value);
      out[col] = cell.value;
      continue;
    }
    if (cell.kind === 'num') { out[col] = Number(cell.value); continue; }
    if (cell.kind === 'bool') { out[col] = cell.value ? 1 : 0; continue; }
    // COPY の raw は数値列も文字列で来る。id 系・数値列は数値化する（users.id は文字列のまま）
    if (!(col === 'id' && spec.textId) &&
        /^(id|sortOrder|offsetX|offsetY|width|height|backgroundId|costumeId|backHairId|faceId|frontHairId|scale|dragX|dragY)$/.test(col)) {
      out[col] = Number(cell.value);
      continue;
    }
    out[col] = cell.value;
  }
  return out;
}

// assetPath の旧ディレクトリ名を正式名称へ。戻り値: [newPath, renamed(bool)]
function renameAssetPath(p) {
  if (typeof p !== 'string') return [p, false];
  const m = p.match(/^\/uploads\/(bg|csm|nav)\/(.+)$/);
  if (!m) return [p, false];
  return [`/uploads/${RENAMES[m[1]]}/${m[2]}`, true];
}

// ---------- メイン ----------

function main() {
  const args = process.argv.slice(2);
  const dumpPath = args.find((a) => !a.startsWith('--'));
  const outIdx = args.indexOf('--out');
  const outDir = outIdx >= 0 ? args[outIdx + 1] : 'out';
  if (!dumpPath) {
    console.error('usage: node pg-to-d1.mjs <dump.sql> [--out <dir>]');
    process.exit(1);
  }
  const sql = readFileSync(dumpPath, 'utf8');
  const parsed = parseDump(sql);

  const report = {
    tables: {},
    sortOrderDedupe: [],
    assetPathRenames: { total: 0, byTable: {} },
    warnings: [],
  };
  const r2plan = [];
  const insertSql = [];

  for (const [table, spec] of Object.entries(TABLES)) {
    const entry = parsed[table];
    const rows = entry ? entry.rows.map((r) => convertRow(table, spec, r)) : [];
    report.tables[table] = rows.length;
    if (!entry && table !== 'favorites') {
      // favorites は後から追加された機能なので、古いダンプに無いこと自体は異常ではない
      report.warnings.push(`テーブル ${table} がダンプに見つかりませんでした（0件として扱います）`);
    }

    // 1. assetPath 書き換え
    if (spec.asset) {
      let renamed = 0;
      for (const row of rows) {
        if (row.assetPath != null) {
          const [np, changed] = renameAssetPath(row.assetPath);
          if (changed) { row.assetPath = np; renamed++; }
        }
      }
      if (renamed > 0) {
        report.assetPathRenames.byTable[table] = renamed;
        report.assetPathRenames.total += renamed;
      }
    }

    // 2. sortOrder 重複解消（有効行のみ、(sortOrder, id) 順で 1..N に振り直し）
    if (spec.parts) {
      const active = rows.filter((r) => r.deleted === 0);
      const byOrder = new Map();
      for (const r of active) {
        if (!byOrder.has(r.sortOrder)) byOrder.set(r.sortOrder, []);
        byOrder.get(r.sortOrder).push(r.id);
      }
      const dupGroups = [...byOrder.entries()].filter(([, ids]) => ids.length > 1);
      if (dupGroups.length > 0) {
        const sorted = [...active].sort((a, b) => (a.sortOrder - b.sortOrder) || (a.id - b.id));
        let changed = 0;
        sorted.forEach((r, idx) => {
          if (r.sortOrder !== idx + 1) { r.sortOrder = idx + 1; changed++; }
        });
        report.sortOrderDedupe.push({
          table,
          duplicateGroups: dupGroups.length,
          duplicateRows: dupGroups.reduce((n, [, ids]) => n + ids.length, 0),
          renumberedRows: changed,
        });
      }
    }

    // 3. R2 コピー計画（DB が指す新しい相対パスをキー、実ファイルの所在は旧パスの可能性を併記）
    if (spec.asset) {
      for (const row of rows) {
        if (row.assetPath == null) continue;
        const key = row.assetPath.replace(/^\//, '');
        // 実ファイルは本番 uploads/ 配下。改名適用前なら旧ディレクトリに残っている
        const oldKey = key.replace(
          /^uploads\/(background|costume|navigationButton)\//,
          (_, d) => `uploads/${{ background: 'bg', costume: 'csm', navigationButton: 'nav' }[d]}/`
        );
        r2plan.push({
          table, id: row.id, deleted: spec.parts ? row.deleted === 1 : false,
          sourceCandidates: oldKey === key ? [key] : [oldKey, key],
          r2Key: key.replace(/^uploads\//, ''),
        });
      }
    }

    // INSERT 文生成
    for (const row of rows) {
      const vals = spec.cols.map((c) => sqlLiteral(row[c])).join(', ');
      insertSql.push(`INSERT INTO ${table} (${spec.cols.join(', ')}) VALUES (${vals});`);
    }
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'd1-data.sql'), insertSql.join('\n') + '\n');
  writeFileSync(join(outDir, 'r2-copy-plan.json'), JSON.stringify(r2plan, null, 2) + '\n');
  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');

  const md = [];
  md.push('# 変換レポート');
  md.push('');
  md.push('## テーブル別件数（変換後）');
  for (const [t, n] of Object.entries(report.tables)) md.push(`- ${t}: ${n}`);
  md.push('');
  md.push('## sortOrder 重複解消');
  if (report.sortOrderDedupe.length === 0) md.push('- 重複なし（全テーブルで有効行の sortOrder は一意）');
  for (const d of report.sortOrderDedupe) {
    md.push(`- ${d.table}: 重複グループ ${d.duplicateGroups} 件（対象 ${d.duplicateRows} 行）、振り直し ${d.renumberedRows} 行`);
  }
  md.push('');
  md.push('## assetPath 書き換え（旧ディレクトリ名 -> 正式名称）');
  md.push(`- 合計 ${report.assetPathRenames.total} 件`);
  for (const [t, n] of Object.entries(report.assetPathRenames.byTable)) md.push(`- ${t}: ${n}`);
  md.push('');
  md.push('## R2 コピー計画');
  md.push(`- 対象ファイル ${r2plan.length} 件（うち削除済み行のもの ${r2plan.filter((r) => r.deleted).length} 件）`);
  if (report.warnings.length) {
    md.push('');
    md.push('## 警告');
    for (const w of report.warnings) md.push(`- ${w}`);
  }
  const mdText = md.join('\n') + '\n';
  writeFileSync(join(outDir, 'report.md'), mdText);
  console.log(mdText);
}

main();
