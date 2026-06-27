import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const htmlDir = path.join(repoRoot, 'html');

function isLocalAsset(reference) {
  return !reference.startsWith('http://') &&
    !reference.startsWith('https://') &&
    !reference.startsWith('data:') &&
    !reference.startsWith('#');
}

test('critical HTML pages reference existing local assets and declare titles', async () => {
  const htmlFiles = (await fs.readdir(htmlDir))
    .filter(file => file.endsWith('.html'))
    .sort();

  assert.ok(htmlFiles.length > 0, '应存在 HTML 页面');

  for (const htmlFile of htmlFiles) {
    const filePath = path.join(htmlDir, htmlFile);
    const content = await fs.readFile(filePath, 'utf8');

    assert.match(content, /<title>.+<\/title>/, `${htmlFile} 缺少 title`);
    assert.match(content, /<meta charset="UTF-8">/i, `${htmlFile} 缺少 UTF-8 声明`);

    for (const match of content.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
      const reference = match[1];
      if (!isLocalAsset(reference)) {
        continue;
      }
      const resolved = path.resolve(path.dirname(filePath), reference);
      await fs.access(resolved);
    }
  }
});
