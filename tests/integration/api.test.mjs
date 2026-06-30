import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createAxiosStub, createBrowserEnvironment, loadBrowserScript } from '../helpers/browser-env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, '../../js/api.js');

test('api.js derives base path from current HTML location', async () => {
  const env = createBrowserEnvironment({
    pathname: '/hivehbase/html/login.html'
  });
  const axiosStub = createAxiosStub();
  env.window.axios = axiosStub.axios;

  await loadBrowserScript(scriptPath, env);

  assert.equal(axiosStub.service.baseURL, '/hivehbase');
  assert.equal(env.window.resolveAppUrl('login'), '/hivehbase/login');
});

test('api.js request and response interceptors update request capsule state', async () => {
  const env = createBrowserEnvironment({
    pathname: '/hivehbase/html/manage.html',
    apiBaseUrl: '/custom-root/'
  });
  const axiosStub = createAxiosStub();
  env.window.axios = axiosStub.axios;

  await loadBrowserScript(scriptPath, env);

  const requestHandler = axiosStub.requestHandlers[0];
  const responseHandler = axiosStub.responseSuccessHandlers[0];
  const config = requestHandler({
    url: '/report',
    requestName: '加载报告'
  });

  const requestElement = env.document.getElementById(`request-capsule-${config._requestId}`);
  assert.ok(requestElement, '应创建请求胶囊元素');
  assert.equal(axiosStub.service.baseURL, '/custom-root');

  config.onUploadProgress({ loaded: 2, total: 4 });
  assert.equal(requestElement.querySelector('.request-capsule-progress').textContent, '50%');

  responseHandler({ config });
  assert.ok(requestElement.classList.contains('success'));

  env.runTimers();
  assert.equal(env.document.getElementById(`request-capsule-${config._requestId}`), null);
});

test('api.js marks failed requests as error', async () => {
  const env = createBrowserEnvironment({
    pathname: '/hivehbase/html/manage.html'
  });
  const axiosStub = createAxiosStub();
  env.window.axios = axiosStub.axios;
  const originalError = console.error;

  try {
    console.error = () => {};
    await loadBrowserScript(scriptPath, env);

    const requestHandler = axiosStub.requestHandlers[0];
    const errorHandler = axiosStub.responseErrorHandlers[0];
    const config = requestHandler({
      url: '/report',
      requestName: '加载报告'
    });

    const requestElement = env.document.getElementById(`request-capsule-${config._requestId}`);
    await assert.rejects(errorHandler({ config, message: 'network error' }));
    assert.ok(requestElement.classList.contains('error'));
  } finally {
    console.error = originalError;
  }
});

test('api.js supports silent requests without showing request capsule', async () => {
  const env = createBrowserEnvironment({
    pathname: '/hivehbase/html/show-report.html'
  });
  const axiosStub = createAxiosStub();
  env.window.axios = axiosStub.axios;

  await loadBrowserScript(scriptPath, env);

  const requestHandler = axiosStub.requestHandlers[0];
  const responseHandler = axiosStub.responseSuccessHandlers[0];
  const config = requestHandler({
    url: '/reports/1/blocks/2',
    requestName: '实时刷新',
    silent: true,
    showRequestCapsule: false
  });

  assert.equal(config._showRequestCapsule, false);
  assert.equal(config._requestId, undefined);
  assert.equal(env.document.getElementById('request-capsule-container'), null);

  responseHandler({ config });
  assert.equal(env.document.getElementById('request-capsule-container'), null);
});
