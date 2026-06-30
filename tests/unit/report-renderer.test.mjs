import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createBrowserEnvironment, loadBrowserScript } from '../helpers/browser-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, '../../js/report-renderer.js');

function createRenderer() {
  const env = createBrowserEnvironment();
  env.window.Request = class Request {};
  env.window.ChartParser = {};
  env.window.ChartFactory = {};

  const container = env.document.createElement('div');
  env.document.body.appendChild(container);

  return { env, container };
}

test('ReportRenderer preserves realtime block metadata from sections payload', async () => {
  const { env, container } = createRenderer();
  await loadBrowserScript(scriptPath, env, ['ReportRenderer']);

  const renderer = new env.window.ReportRenderer({ container });
  renderer.renderFromPayload({
    report: {
      title: '实时报告',
      sections: [
        {
          id: 12,
          type: 'chart',
          realtime: true,
          refreshIntervalMs: 1500,
          query: { table: 'family_impact_analysis', columns: ['name', 'value'] },
          data: { title: 'family_impact_analysis', columns: ['name', 'value'], rows: [['A', 1]] }
        }
      ]
    }
  });

  const realtimeBlocks = renderer.getRealtimeBlocks();
  assert.equal(realtimeBlocks.length, 1);
  assert.equal(realtimeBlocks[0].id, 12);
  assert.equal(realtimeBlocks[0].refreshIntervalMs, 1500);
  assert.deepEqual(realtimeBlocks[0].query, {
    table: 'family_impact_analysis',
    columns: ['name', 'value']
  });
});

test('ReportRenderer.replaceBlock updates only the target block content', async () => {
  const { env, container } = createRenderer();
  await loadBrowserScript(scriptPath, env, ['ReportRenderer']);

  const renderer = new env.window.ReportRenderer({ container });
  renderer.renderFromPayload({
    report: {
      title: '文本报告',
      sections: [
        { id: 1, type: 'text', realtime: true, data: '旧内容' },
        { id: 2, type: 'text', realtime: false, data: '第二段' }
      ]
    }
  });

  let paragraphs = container.querySelectorAll('.section-paragraph');
  assert.equal(paragraphs.length, 2);
  assert.equal(paragraphs[0].textContent, '旧内容');
  assert.equal(paragraphs[1].textContent, '第二段');

  const updated = renderer.replaceBlock({ id: 1, type: 'text', realtime: true, data: '新内容' });
  assert.equal(updated, true);

  paragraphs = container.querySelectorAll('.section-paragraph');
  assert.equal(paragraphs.length, 2);
  assert.equal(paragraphs[0].textContent, '新内容');
  assert.equal(paragraphs[1].textContent, '第二段');
  assert.equal(renderer.getRealtimeBlocks()[0].data, '新内容');
});
