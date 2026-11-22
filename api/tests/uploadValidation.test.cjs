const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const express = require('express');
const multer = require('multer');

const {
  imageFileFilter,
  singleImageUpload,
  MAX_UPLOAD_FILE_SIZE,
} = require('../dist/middleware/uploadValidation.js');

function runFilter(originalname, mimetype) {
  return new Promise((resolve) => {
    imageFileFilter({}, { originalname, mimetype }, (err, accepted) => {
      resolve({ err, accepted });
    });
  });
}

test('#143 fileFilter accepts PNG files', async () => {
  const { err, accepted } = await runFilter('part.png', 'image/png');
  assert.equal(err, null);
  assert.equal(accepted, true);
  const upper = await runFilter('part.PNG', 'image/png');
  assert.equal(upper.accepted, true);
});

test('#143 fileFilter rejects non-PNG files', async () => {
  for (const [name, mime] of [
    ['evil.html', 'text/html'],
    ['evil.svg', 'image/svg+xml'],
    ['photo.jpg', 'image/jpeg'],
    ['fake.png', 'text/html'],
  ]) {
    const { err, accepted } = await runFilter(name, mime);
    assert.ok(err instanceof Error, `${name} should be rejected with an error`);
    assert.notEqual(accepted, true);
  }
});

// --- HTTP level: multer errors are translated to 400 JSON ---

let server;
let baseUrl;

before(async () => {
  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_UPLOAD_FILE_SIZE },
  });
  app.post('/upload', singleImageUpload(upload, 'asset'), (req, res) => {
    res.json({ ok: true, size: req.file.size });
  });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function postFile(name, type, content) {
  const form = new FormData();
  form.append('asset', new Blob([content], { type }), name);
  return fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
}

test('#143 upload accepts a small PNG', async () => {
  const res = await postFile('ok.png', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  assert.equal(res.status, 200);
});

test('#143 upload rejects an HTML file with 400', async () => {
  const res = await postFile('evil.html', 'text/html', '<script>alert(1)</script>');
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /PNG/);
});

test('#143 upload rejects an oversized file with 400', async () => {
  const big = Buffer.alloc(MAX_UPLOAD_FILE_SIZE + 1, 0x41);
  const res = await postFile('big.png', 'image/png', big);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /too large/i);
});
