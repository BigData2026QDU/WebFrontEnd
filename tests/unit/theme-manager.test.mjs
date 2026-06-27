import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createBrowserEnvironment, loadBrowserScript } from '../helpers/browser-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, '../../js/theme-manager.js');

test('ThemeManager uses saved theme preference on startup', async () => {
  const env = createBrowserEnvironment({
    localStorageState: { theme: 'dark' }
  });

  await loadBrowserScript(scriptPath, env, ['ThemeManager']);
  env.fireDOMContentLoaded();

  assert.equal(env.window.ThemeManager.getTheme(), 'dark');
  assert.equal(env.document.documentElement.getAttribute('data-theme'), 'dark');
  assert.equal(env.localStorage.getItem('theme'), 'dark');
});

test('ThemeManager follows system preference without persisting auto-selected theme', async () => {
  const env = createBrowserEnvironment({ prefersDark: false });

  await loadBrowserScript(scriptPath, env, ['ThemeManager']);
  env.fireDOMContentLoaded();

  assert.equal(env.window.ThemeManager.getTheme(), 'light');
  assert.equal(env.localStorage.getItem('theme'), null);

  env.matchMediaController.trigger(true);

  assert.equal(env.window.ThemeManager.getTheme(), 'dark');
  assert.equal(env.document.documentElement.getAttribute('data-theme'), 'dark');
  assert.equal(env.localStorage.getItem('theme'), null);
});

test('ThemeManager.toggle persists explicit user choice', async () => {
  const env = createBrowserEnvironment({ prefersDark: true });

  await loadBrowserScript(scriptPath, env, ['ThemeManager']);
  env.fireDOMContentLoaded();
  env.window.ThemeManager.toggle();

  assert.equal(env.window.ThemeManager.getTheme(), 'light');
  assert.equal(env.localStorage.getItem('theme'), 'light');
});
