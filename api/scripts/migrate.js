#!/usr/bin/env node

/**
 * Database Migration Runner
 * 
 * このスクリプトは、データベースマイグレーションを安全に実行します。
 * 
 * 使用方法:
 *   npm run migrate        - 未適用のマイグレーションを実行
 *   npm run migrate:status - マイグレーションの状態を確認
 *   npm run migrate:undo   - 最後のマイグレーションを取り消す
 */

const { execSync } = require('child_process');
const path = require('path');

// 環境変数を読み込む
require('dotenv').config();

const command = process.argv[2] || 'migrate';

const commands = {
  'migrate': 'npx sequelize-cli db:migrate',
  'status': 'npx sequelize-cli db:migrate:status',
  'undo': 'npx sequelize-cli db:migrate:undo',
};

const cmd = commands[command];

if (!cmd) {
  console.error(`Unknown command: ${command}`);
  console.error('Available commands: migrate, status, undo');
  process.exit(1);
}

console.log(`Running: ${cmd}`);
console.log('---');

try {
  execSync(cmd, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
  console.log('---');
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('---');
  console.error('Migration failed!');
  console.error('');
  console.error('トラブルシューティング:');
  console.error('1. データベースが起動しているか確認してください');
  console.error('2. .env ファイルの設定が正しいか確認してください');
  console.error('3. テーブルがすでに存在する場合、手動でカラムを確認してください');
  console.error('');
  console.error('詳細は DEVELOPMENT.md の「データベースマイグレーション」セクションを参照してください');
  process.exit(1);
}
