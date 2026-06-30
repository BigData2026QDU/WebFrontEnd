(function() {
  if (typeof window === 'undefined' || !window.axios) {
    console.error('Axios is not loaded. Please ensure axios.min.js is included before api.js');
    return;
  }

  function normalizeBasePath(basePath) {
    if (!basePath || basePath === '/') {
      return '';
    }
    return basePath.replace(/\/+$/, '');
  }

  function detectBasePath() {
    const pathname = (window.location && window.location.pathname) ? window.location.pathname : '';
    if (!pathname || pathname === '/') {
      return '';
    }

    const cleanPath = pathname.endsWith('/') && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;

    const htmlIndex = cleanPath.indexOf('/html/');
    if (htmlIndex >= 0) {
      return cleanPath.substring(0, htmlIndex);
    }

    const lastSlash = cleanPath.lastIndexOf('/');
    if (lastSlash > 0) {
      return cleanPath.substring(0, lastSlash);
    }

    return '';
  }

  const BASE_URL = normalizeBasePath(window.API_BASE_URL || detectBasePath());
  window.apiBasePath = BASE_URL;
  window.resolveAppUrl = function(path) {
    const normalizedPath = !path ? '' : (path.startsWith('/') ? path : `/${path}`);
    return `${BASE_URL}${normalizedPath}`;
  };
  let activeRequests = 0;
  const MAX_DISPLAYED_REQUESTS = 3;

  function createRequestCapsule() {
    let capsule = document.getElementById('request-capsule-container');
    if (!capsule) {
      capsule = document.createElement('div');
      capsule.id = 'request-capsule-container';
      document.body.appendChild(capsule);
    }
    return capsule;
  }

  function addRequestToCapsule(requestId, requestName) {
    const capsuleContainer = createRequestCapsule();
    const requestElement = document.createElement('div');
    requestElement.id = `request-capsule-${requestId}`;
    requestElement.className = 'request-capsule-item loading';
    requestElement.innerHTML = `
      <span class="request-capsule-text">正在加载: ${requestName}</span>
      <span class="request-capsule-progress">0%</span>
      <div class="request-capsule-bar"></div>
    `;
    capsuleContainer.prepend(requestElement);
    
    const currentItems = capsuleContainer.querySelectorAll('.request-capsule-item');
    if (currentItems.length > MAX_DISPLAYED_REQUESTS) {
      currentItems[currentItems.length - 1].style.display = 'none';
    }
    return requestElement;
  }

  function updateRequestCapsule(requestId, progress) {
    const requestElement = document.getElementById(`request-capsule-${requestId}`);
    if (requestElement) {
      const progressBar = requestElement.querySelector('.request-capsule-bar');
      const progressText = requestElement.querySelector('.request-capsule-progress');
      if (progressBar && progressText) {
        const percentage = Math.round(progress * 100);
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}%`;
      }
    }
  }

  function removeRequestFromCapsule(requestId, status = 'success') {
    const requestElement = document.getElementById(`request-capsule-${requestId}`);
    if (requestElement) {
      requestElement.classList.remove('loading');
      requestElement.classList.add(status);
      const progressBar = requestElement.querySelector('.request-capsule-bar');
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.style.backgroundColor = status === 'success' ? 'var(--success-color)' : 'var(--error-color)';
      }
      const progressText = requestElement.querySelector('.request-capsule-progress');
      if (progressText) {
        progressText.textContent = status === 'success' ? '完成' : '失败';
      }
      
      setTimeout(() => {
        requestElement.remove();
        const capsuleContainer = document.getElementById('request-capsule-container');
        if (capsuleContainer) {
          const hiddenItems = capsuleContainer.querySelectorAll('.request-capsule-item[style*="display: none"]');
          if (hiddenItems.length > 0) {
            hiddenItems[hiddenItems.length - 1].style.display = '';
          }
        }
      }, 3000);
    }
  }

  const service = axios.create({
    baseURL: BASE_URL,
    timeout: 10000
  });

  service.interceptors.request.use(
    config => {
      const showRequestCapsule = config.showRequestCapsule !== false && config.silent !== true;
      config._showRequestCapsule = showRequestCapsule;

      if (showRequestCapsule) {
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        config._requestId = requestId;
        activeRequests++;

        const requestName = config.requestName || config.url;
        addRequestToCapsule(requestId, requestName);

        if (config.onUploadProgress) {
          const originalOnUploadProgress = config.onUploadProgress;
          config.onUploadProgress = progressEvent => {
            const percentage = progressEvent.total ? (progressEvent.loaded * 1) / progressEvent.total : 0;
            updateRequestCapsule(requestId, percentage);
            originalOnUploadProgress(progressEvent);
          };
        } else {
          config.onUploadProgress = progressEvent => {
            const percentage = progressEvent.total ? (progressEvent.loaded * 1) / progressEvent.total : 0;
            updateRequestCapsule(requestId, percentage);
          };
        }
      }

      return config;
    },
    error => {
      console.error('Request Error:', error);
      return Promise.reject(error);
    }
  );

  service.interceptors.response.use(
    response => {
      if (response.config && response.config._showRequestCapsule) {
        activeRequests--;
      }
      if (response.config._requestId) {
        removeRequestFromCapsule(response.config._requestId, 'success');
      }
      return response;
    },
    error => {
      if (error.config && error.config._showRequestCapsule) {
        activeRequests--;
      }
      if (error.config && error.config._requestId) {
        removeRequestFromCapsule(error.config._requestId, 'error');
      }
      console.error('Response Error:', error);
      return Promise.reject(error);
    }
  );

  window.apiService = service;
})();
