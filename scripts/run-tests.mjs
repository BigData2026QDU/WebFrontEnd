import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const suiteArg = process.argv[2] ?? 'all';
const suiteDirectories = {
  unit: 'tests/unit',
  integration: 'tests/integration',
  e2e: 'tests/e2e'
};

async function collectSuiteFiles(relativeDir) {
  const dir = path.join(repoRoot, relativeDir);
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.test.mjs'))
    .map(entry => path.join(dir, entry.name))
    .sort();
}

async function resolveTestFiles() {
  if (suiteArg === 'all') {
    const files = [];
    for (const relativeDir of Object.values(suiteDirectories)) {
      files.push(...await collectSuiteFiles(relativeDir));
    }
    return files;
  }

  const relativeDir = suiteDirectories[suiteArg];
  if (!relativeDir) {
    throw new Error(`未知测试套件: ${suiteArg}`);
  }
  return collectSuiteFiles(relativeDir);
}

async function main() {
  const testFiles = await resolveTestFiles();
  if (testFiles.length === 0) {
    throw new Error(`未找到测试文件: ${suiteArg}`);
  }

  console.log(`执行测试套件: ${suiteArg}`);
  const result = spawnSync(process.execPath, ['--test', ...testFiles], {
    cwd: repoRoot,
    stdio: 'inherit'
  });

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
