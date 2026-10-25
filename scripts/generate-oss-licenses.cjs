const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const projects = [
  { directory: '', scope: 'frontend' },
  { directory: 'api', scope: 'backend' },
];

function getLicenseEntries(root = projectRoot) {
  const entries = [];

  for (const project of projects) {
    const packagePath = path.join(root, project.directory, 'package.json');
    const lockPath = path.join(root, project.directory, 'package-lock.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const packageLock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

    for (const name of Object.keys(packageJson.dependencies || {})) {
      const lockedPackage = packageLock.packages[`node_modules/${name}`];
      if (!lockedPackage) {
        throw new Error(`No lockfile entry found for ${name} in ${lockPath}`);
      }
      if (!lockedPackage.license) {
        throw new Error(`No license metadata found for ${name} in ${lockPath}`);
      }

      entries.push({
        name,
        version: lockedPackage.version,
        scope: project.scope,
        license: Array.isArray(lockedPackage.license)
          ? lockedPackage.license.join(' OR ')
          : lockedPackage.license,
        url: `https://www.npmjs.com/package/${name}`,
      });
    }
  }

  return entries.sort((left, right) => {
    const leftKey = `${left.scope}:${left.name}`;
    const rightKey = `${right.scope}:${right.name}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}

function renderLicenseModule(entries) {
  return `export const ossLicenses = ${JSON.stringify(entries, null, 2)} as const;\n`;
}

if (require.main === module) {
  const outputPath = path.join(projectRoot, 'src/generated/ossLicenses.ts');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, renderLicenseModule(getLicenseEntries()));
}

module.exports = { getLicenseEntries, renderLicenseModule };
