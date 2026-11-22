const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  isAdminEnabled,
  requireAdminEnabled,
} = require('../dist/middleware/adminGate.js');

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

function runGuard() {
  const response = createResponse();
  let nextCalled = false;
  requireAdminEnabled({}, response, () => {
    nextCalled = true;
  });
  return { response, nextCalled };
}

function withAdminEnv(value, fn) {
  const original = process.env.ADMIN_ENABLED;
  try {
    if (value === undefined) {
      delete process.env.ADMIN_ENABLED;
    } else {
      process.env.ADMIN_ENABLED = value;
    }
    fn();
  } finally {
    if (original === undefined) {
      delete process.env.ADMIN_ENABLED;
    } else {
      process.env.ADMIN_ENABLED = original;
    }
  }
}

test('admin is enabled by default when ADMIN_ENABLED is not set', () => {
  withAdminEnv(undefined, () => {
    assert.equal(isAdminEnabled(), true);
  });
});

test('admin is disabled only when ADMIN_ENABLED is false or 0', () => {
  withAdminEnv('false', () => {
    assert.equal(isAdminEnabled(), false);
  });
  withAdminEnv('0', () => {
    assert.equal(isAdminEnabled(), false);
  });
  withAdminEnv('true', () => {
    assert.equal(isAdminEnabled(), true);
  });
  withAdminEnv('1', () => {
    assert.equal(isAdminEnabled(), true);
  });
});

test('requireAdminEnabled passes the request through when enabled', () => {
  withAdminEnv(undefined, () => {
    const { response, nextCalled } = runGuard();
    assert.equal(response.statusCode, 200);
    assert.equal(nextCalled, true);
  });
});

test('requireAdminEnabled returns 404 when disabled', () => {
  withAdminEnv('false', () => {
    const { response, nextCalled } = runGuard();
    assert.equal(response.statusCode, 404);
    assert.equal(response.body.error, 'Not found');
    assert.equal(nextCalled, false);
  });
});
