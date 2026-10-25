const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { getLicenseEntries, renderLicenseModule } = require('./generate-oss-licenses.cjs');

const root = path.resolve(__dirname, '..');

test('license list contains every direct production dependency from both projects', () => {
  const entries = getLicenseEntries(root);
  const expected = [];

  for (const project of [
    { directory: '', scope: 'frontend' },
    { directory: 'api', scope: 'backend' },
  ]) {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(root, project.directory, 'package.json'), 'utf8')
    );
    for (const name of Object.keys(packageJson.dependencies || {})) {
      expected.push(`${project.scope}:${name}`);
    }
  }

  assert.deepEqual(
    entries.map(entry => `${entry.scope}:${entry.name}`).sort(),
    expected.sort()
  );
  assert.ok(entries.every(entry => entry.version && entry.license && entry.url));
});

test('committed license data matches current manifests and lockfiles', () => {
  const generatedPath = path.join(root, 'src/generated/ossLicenses.ts');
  assert.equal(
    fs.readFileSync(generatedPath, 'utf8'),
    renderLicenseModule(getLicenseEntries(root))
  );
});
