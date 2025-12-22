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
  // 必要な環境変数のみを渡す（undefinedを除外）
  // セキュリティのため、DB関連の変数とPATH（npm実行に必要）のみを渡す
  // 追加の環境変数が必要な場合は、requiredEnvVarsに追加してください
  const env = {};
  // PATH はnpmコマンド実行に必要
  const requiredEnvVars = ['NODE_ENV', 'DB_NAME', 'DB_USER', 'DB_PASS', 'DB_HOST', 'DB_PORT', 'PATH'];
  
  requiredEnvVars.forEach(key => {
    if (process.env[key] !== undefined) {
      env[key] = process.env[key];
    }
  });
  
  execSync(cmd, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: env,
  });
  console.log('---');
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('---');
  console.error('Migration failed!');
  if (error.message) {
    console.error('Error:', error.message);
  }
  console.error('');
  console.error('トラブルシューティング:');
  console.error('');
  console.error('1. データベースが起動しているか確認してください');
  console.error('   docker compose -f docker-compose.dev.yml ps');
  console.error('');
  console.error('2. .env ファイルの設定が正しいか確認してください');
  console.error('   DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME');
  console.error('');
  console.error('3. 「column already exists」エラーの場合:');
  console.error('   → 新規データベースではマイグレーション不要です');
  console.error('   → sequelize.sync() で作成されたテーブルは最新です');
  console.error('   → 詳細は doc/DEVELOPMENT.md の「データベースマイグレーション管理」を参照');
  console.error('');
  console.error('4. 詳しいトラブルシューティング:');
  console.error('   doc/DEVELOPMENT.md の「データベースマイグレーション管理」セクション');
  process.exit(1);
}
