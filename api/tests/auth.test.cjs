const assert = require('node:assert/strict');
const { test } = require('node:test');

process.env.SYSTEM_ADMIN_EMAILS = 'root@example.com';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';

const {
  authenticate,
  isSystemAdmin,
  requireAdmin,
  requireSystemAdmin,
} = require('../dist/middleware/auth.js');

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function runGuard(guard, user) {
  const response = createResponse();
  let nextCalled = false;
  guard({ user }, response, () => {
    nextCalled = true;
  });
  return { response, nextCalled };
}

test('authenticate rejects requests without a bearer token', async () => {
  const response = createResponse();
  let nextCalled = false;

  await authenticate({ headers: {} }, response, () => {
    nextCalled = true;
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.error, 'Unauthorized: No token provided');
  assert.equal(nextCalled, false);
});

test('system administrator allowlist is matched exactly', () => {
  assert.equal(isSystemAdmin('root@example.com'), true);
  assert.equal(isSystemAdmin('ROOT@example.com'), false);
  assert.equal(isSystemAdmin(undefined), false);
});

test('admin guard permits system administrators and game masters only', () => {
  for (const role of ['system_admin', 'game_master']) {
    const { response, nextCalled } = runGuard(requireAdmin, { role });
    assert.equal(response.statusCode, 200);
    assert.equal(nextCalled, true);
  }

  const denied = runGuard(requireAdmin, { role: 'user' });
  assert.equal(denied.response.statusCode, 403);
  assert.equal(denied.nextCalled, false);
});

test('system admin guard permits only system administrators', () => {
  const allowed = runGuard(requireSystemAdmin, { role: 'system_admin' });
  assert.equal(allowed.nextCalled, true);

  const denied = runGuard(requireSystemAdmin, { role: 'game_master' });
  assert.equal(denied.response.statusCode, 403);
  assert.equal(denied.nextCalled, false);
});
