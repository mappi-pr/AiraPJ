'use strict';

// テスト用の「疑似ログイン」を提供する仕組み（Issue #131）。
//
// 差し替えるのは外部サービスである Google の ID トークン検証だけ。
// google-auth-library の OAuth2Client.prototype.verifyIdToken を、
// テスト用ユーザーに対応するトークンだけを受け付ける実装に置き換える。
//
// api 側の実装（middleware/auth.ts・routes/auth.ts）には一切手を入れないため、
// 以下の本物の経路がそのまま検証できる:
//   - POST /api/auth/verify でのログイン（トークン検証 → ロール解決 → 応答）
//   - Authorization: Bearer <token> による authenticate
//   - ロール解決: SYSTEM_ADMIN_EMAILS 照合（システム管理者）
//                 GameMaster テーブルの DB 照合（ゲームマスター）
//   - requireAdmin / requireSystemAdmin による 403 の振り分け
//
// 使い方: dist 配下のモジュールを require する前に installFakeGoogleAuth() を呼ぶこと。
// （SYSTEM_ADMIN_EMAILS は middleware/auth.ts が読み込み時に環境変数から決めるため）

const { OAuth2Client } = require('google-auth-library');

// テスト用ユーザー。token が Google ID トークンの代わりになる文字列。
const TEST_USERS = {
  // システム管理者: SYSTEM_ADMIN_EMAILS に登録して再現する
  admin: {
    token: 'db-test-token-admin',
    payload: { email: 'db-test-admin@example.com', name: 'DB Test Admin', sub: 'db-test-admin' },
  },
  // ゲームマスター: GameMaster テーブルに email を登録して再現する（seed 側で投入）
  gameMaster: {
    token: 'db-test-token-gamemaster',
    payload: { email: 'db-test-gm@example.com', name: 'DB Test GameMaster', sub: 'db-test-gm' },
  },
  // 一般ユーザー: どちらの管理者条件にも当てはまらない
  user: {
    token: 'db-test-token-user',
    payload: { email: 'db-test-user@example.com', name: 'DB Test User', sub: 'db-test-user' },
  },
};

function installFakeGoogleAuth() {
  if (!process.env.SYSTEM_ADMIN_EMAILS) {
    process.env.SYSTEM_ADMIN_EMAILS = TEST_USERS.admin.payload.email;
  }
  const payloadByToken = new Map(
    Object.values(TEST_USERS).map((user) => [user.token, user.payload])
  );
  OAuth2Client.prototype.verifyIdToken = async function verifyIdToken({ idToken }) {
    const payload = payloadByToken.get(idToken);
    if (!payload) {
      throw new Error('Invalid token');
    }
    // LoginTicket 相当（middleware は getPayload() しか使わない）
    return { getPayload: () => ({ ...payload }) };
  };
  return TEST_USERS;
}

module.exports = { installFakeGoogleAuth, TEST_USERS };
