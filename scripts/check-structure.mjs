import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const requiredPaths = [
  'Architecture.md',
  'File_Index.md',
  'README.md',
  'package.json',
  'css',
  'html',
  'js',
  'WEB-INF/web.xml',
  'scripts/check-structure.mjs',
  'scripts/run-tests.mjs',
  'tests/unit',
  'tests/integration',
  'tests/e2e',
  '.github/workflows/ci.yml'
];
const forbiddenReferences = ['FrontendTestSkeleton', 'DayNightModule'];

async function exists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'AGENTS') {
        continue;
      }
      files.push(...await collectFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function isLocalAsset(reference) {
  return !reference.startsWith('http://') &&
    !reference.startsWith('https://') &&
    !reference.startsWith('data:') &&
    !reference.startsWith('mailto:') &&
    !reference.startsWith('javascript:') &&
    !reference.startsWith('#');
}

async function verifyHtmlReferences(issues) {
  const htmlDir = path.join(repoRoot, 'html');
  const htmlFiles = (await fs.readdir(htmlDir))
    .filter(name => name.endsWith('.html'))
    .map(name => path.join(htmlDir, name));

  for (const filePath of htmlFiles) {
    const content = await fs.readFile(filePath, 'utf8');
    const matches = content.matchAll(/\b(?:src|href)=["']([^"']+)["']/g);
    for (const match of matches) {
      const reference = match[1];
      if (!isLocalAsset(reference)) {
        continue;
      }
      const resolved = path.resolve(path.dirname(filePath), reference);
      try {
        await fs.access(resolved);
      } catch {
        issues.push(`HTML 引用了不存在的本地资源: ${path.relative(repoRoot, filePath)} -> ${reference}`);
      }
    }
  }
}

async function verifyPackageScripts(issues) {
  const packageJson = JSON.parse(await fs.readFile(path.join(repoRoot, 'package.json'), 'utf8'));
  const expectedScripts = {
    'check:structure': 'scripts/check-structure.mjs',
    test: 'scripts/run-tests.mjs',
    'test:unit': 'scripts/run-tests.mjs',
    'test:integration': 'scripts/run-tests.mjs',
    'test:e2e': 'scripts/run-tests.mjs',
    ci: 'npm run check:structure'
  };

  for (const [scriptName, requiredTarget] of Object.entries(expectedScripts)) {
    const command = packageJson.scripts?.[scriptName];
    if (!command) {
      issues.push(`package.json 缺少脚本: ${scriptName}`);
      continue;
    }
    if (!command.includes(requiredTarget)) {
      issues.push(`package.json 脚本 ${scriptName} 未指向 ${requiredTarget}`);
    }
    if (scriptName === 'ci' && !command.includes('npm run test')) {
      issues.push('package.json 脚本 ci 未串联 npm run test');
    }
  }
}

async function verifyForbiddenReferences(issues) {
  const files = await collectFiles(repoRoot);
  const textFiles = files.filter(filePath =>
    /\.(md|json|ya?ml|html|js|mjs|css)$/i.test(filePath)
  );

  for (const filePath of textFiles) {
    if (path.resolve(filePath) === path.join(repoRoot, 'scripts', 'check-structure.mjs')) {
      continue;
    }
    const content = await fs.readFile(filePath, 'utf8');
    for (const reference of forbiddenReferences) {
      if (content.includes(reference)) {
        issues.push(`检测到已废弃仓库引用 ${reference}: ${path.relative(repoRoot, filePath)}`);
      }
    }
  }
}

async function main() {
  const issues = [];

  for (const requiredPath of requiredPaths) {
    if (!await exists(requiredPath)) {
      issues.push(`缺少必需路径: ${requiredPath}`);
    }
  }

  await verifyPackageScripts(issues);
  await verifyHtmlReferences(issues);
  await verifyForbiddenReferences(issues);

  if (issues.length > 0) {
    console.error('结构检查失败:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(`结构检查通过，共校验 ${requiredPaths.length} 个必需路径。`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
