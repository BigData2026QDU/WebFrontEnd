import fs from 'node:fs/promises';
import vm from 'node:vm';

class MockElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.children = [];
    this.style = {};
    this.attributes = new Map();
    this._classes = new Set();
    this._innerHTML = '';
    this.textContent = '';
    this.id = '';
  }

  get className() {
    return [...this._classes].join(' ');
  }

  set className(value) {
    this._classes = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  get classList() {
    return {
      add: (...classNames) => {
        for (const className of classNames) {
          this._classes.add(className);
        }
      },
      remove: (...classNames) => {
        for (const className of classNames) {
          this._classes.delete(className);
        }
      },
      toggle: (className, force) => {
        if (force === true) {
          this._classes.add(className);
          return true;
        }
        if (force === false) {
          this._classes.delete(className);
          return false;
        }
        if (this._classes.has(className)) {
          this._classes.delete(className);
          return false;
        }
        this._classes.add(className);
        return true;
      },
      contains: className => this._classes.has(className)
    };
  }

  get firstChild() {
    return this.children[0] ?? null;
  }

  setAttribute(name, value) {
    if (name === 'id') {
      this.id = String(value);
    }
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    if (name === 'id') {
      return this.id || null;
    }
    return this.attributes.get(name) ?? null;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child, referenceNode) {
    child.parentNode = this;
    if (!referenceNode) {
      this.children.push(child);
      return child;
    }
    const index = this.children.indexOf(referenceNode);
    if (index < 0) {
      this.children.push(child);
      return child;
    }
    this.children.splice(index, 0, child);
    return child;
  }

  prepend(child) {
    child.parentNode = this;
    this.children.unshift(child);
    return child;
  }

  replaceChild(newChild, oldChild) {
    const index = this.children.indexOf(oldChild);
    if (index < 0) {
      throw new Error('oldChild not found');
    }
    newChild.parentNode = this;
    this.children[index] = newChild;
    oldChild.parentNode = null;
    return oldChild;
  }

  remove() {
    if (!this.parentNode) {
      return;
    }
    const siblings = this.parentNode.children;
    const index = siblings.indexOf(this);
    if (index >= 0) {
      siblings.splice(index, 1);
    }
    this.parentNode = null;
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.children = [];
    this.textContent = '';

    if (html.includes('request-capsule-text')) {
      const textMatch = html.match(/request-capsule-text">([^<]+)</);
      const progressMatch = html.match(/request-capsule-progress">([^<]+)</);

      const textSpan = this.ownerDocument.createElement('span');
      textSpan.className = 'request-capsule-text';
      textSpan.textContent = textMatch?.[1] ?? '';

      const progressSpan = this.ownerDocument.createElement('span');
      progressSpan.className = 'request-capsule-progress';
      progressSpan.textContent = progressMatch?.[1] ?? '';

      const bar = this.ownerDocument.createElement('div');
      bar.className = 'request-capsule-bar';

      this.appendChild(textSpan);
      this.appendChild(progressSpan);
      this.appendChild(bar);
      return;
    }

    this.textContent = html.replace(/<[^>]+>/g, '').trim();
  }

  get innerHTML() {
    return this._innerHTML;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const results = [];
    const visit = node => {
      if (matchesSelector(node, selector)) {
        results.push(node);
      }
      for (const child of node.children) {
        visit(child);
      }
    };

    for (const child of this.children) {
      visit(child);
    }

    return results;
  }
}

function matchesSelector(element, selector) {
  const hiddenSelector = '[style*="display: none"]';
  let requireHidden = false;
  let baseSelector = selector;

  if (selector.endsWith(hiddenSelector)) {
    requireHidden = true;
    baseSelector = selector.slice(0, -hiddenSelector.length);
  }

  let matches = false;
  if (baseSelector.startsWith('#')) {
    matches = element.id === baseSelector.slice(1);
  } else if (baseSelector.startsWith('.')) {
    const classes = baseSelector.slice(1).split('.').filter(Boolean);
    matches = classes.every(className => element.classList.contains(className));
  } else {
    matches = element.tagName.toLowerCase() === baseSelector.toLowerCase();
  }

  if (!matches) {
    return false;
  }

  return !requireHidden || element.style.display === 'none';
}

class MockDocument {
  constructor() {
    this.documentElement = new MockElement('html', this);
    this.body = new MockElement('body', this);
    this.documentElement.appendChild(this.body);
    this.listeners = new Map();
  }

  createElement(tagName) {
    return new MockElement(tagName, this);
  }

  getElementById(id) {
    const visit = node => {
      if (node.id === id) {
        return node;
      }
      for (const child of node.children) {
        const match = visit(child);
        if (match) {
          return match;
        }
      }
      return null;
    };

    return visit(this.body);
  }

  addEventListener(eventName, handler) {
    const handlers = this.listeners.get(eventName) ?? [];
    handlers.push(handler);
    this.listeners.set(eventName, handlers);
  }

  dispatch(eventName, event = {}) {
    for (const handler of this.listeners.get(eventName) ?? []) {
      handler(event);
    }
  }
}

function createLocalStorage(initialState = {}) {
  const store = new Map(Object.entries(initialState));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

function createMatchMediaController(initialMatches) {
  let matches = initialMatches;
  const listeners = [];
  return {
    getQueryResult() {
      return {
        get matches() {
          return matches;
        },
        addEventListener(eventName, handler) {
          if (eventName === 'change') {
            listeners.push(handler);
          }
        }
      };
    },
    trigger(nextMatches) {
      matches = nextMatches;
      for (const listener of listeners) {
        listener({ matches: nextMatches });
      }
    }
  };
}

export function createAxiosStub() {
  const requestHandlers = [];
  const responseSuccessHandlers = [];
  const responseErrorHandlers = [];
  const service = {
    baseURL: '',
    timeout: 0,
    interceptors: {
      request: {
        use(handler) {
          requestHandlers.push(handler);
          return requestHandlers.length - 1;
        }
      },
      response: {
        use(successHandler, errorHandler) {
          responseSuccessHandlers.push(successHandler);
          responseErrorHandlers.push(errorHandler);
          return responseSuccessHandlers.length - 1;
        }
      }
    }
  };

  return {
    axios: {
      create(config) {
        service.baseURL = config.baseURL;
        service.timeout = config.timeout;
        return service;
      }
    },
    service,
    requestHandlers,
    responseSuccessHandlers,
    responseErrorHandlers
  };
}

export function createBrowserEnvironment(options = {}) {
  const {
    pathname = '/',
    prefersDark = false,
    apiBaseUrl,
    localStorageState = {}
  } = options;

  const document = new MockDocument();
  const localStorage = createLocalStorage(localStorageState);
  const matchMediaController = createMatchMediaController(prefersDark);
  const timers = [];

  const window = {
    document,
    localStorage,
    location: { pathname },
    console,
    navigator: { userAgent: 'node' }
  };

  window.window = window;
  if (apiBaseUrl !== undefined) {
    window.API_BASE_URL = apiBaseUrl;
  }

  window.matchMedia = () => matchMediaController.getQueryResult();
  window.setTimeout = callback => {
    timers.push(callback);
    return timers.length;
  };
  window.clearTimeout = timerId => {
    const index = timerId - 1;
    if (index >= 0 && index < timers.length) {
      timers[index] = null;
    }
  };

  return {
    window,
    document,
    localStorage,
    matchMediaController,
    runTimers() {
      const callbacks = timers.splice(0, timers.length);
      for (const callback of callbacks) {
        if (callback) {
          callback();
        }
      }
    },
    fireDOMContentLoaded() {
      document.dispatch('DOMContentLoaded');
    }
  };
}

export async function loadBrowserScript(scriptPath, env, expose = []) {
  const source = await fs.readFile(scriptPath, 'utf8');
  const exposeSource = expose
    .map(name => `window.${name} = typeof ${name} !== 'undefined' ? ${name} : window.${name};`)
    .join('\n');

  const context = vm.createContext({
    window: env.window,
    document: env.document,
    localStorage: env.localStorage,
    axios: env.window.axios,
    console,
    setTimeout: env.window.setTimeout,
    clearTimeout: env.window.clearTimeout,
    module: { exports: {} },
    exports: {}
  });

  vm.runInContext(`${source}\n${exposeSource}`, context, { filename: scriptPath });
  return context;
}
