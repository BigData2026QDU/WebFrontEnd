(function() {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const DEFAULT_CONFIG = {
    dayStartHour: 6,
    nightStartHour: 18,
    storageKey: 'theme',
    autoUpdateInterval: 60000,
    enableManualOverride: true,
    autoInit: true,
    autoButton: true,
    buttonSelector: ''
  };

  function normalizeTheme(theme) {
    const raw = String(theme || '').trim().toLowerCase();
    if (raw === 'dark' || raw === 'night') {
      return 'dark';
    }
    return 'light';
  }

  function canUseMatchMedia() {
    return typeof window.matchMedia === 'function';
  }

  function dispatchThemeEvent(eventName, detail) {
    const payload = Object.assign({
      timestamp: new Date().toISOString()
    }, detail || {});

    if (typeof window.CustomEvent === 'function' && typeof document.dispatchEvent === 'function') {
      document.dispatchEvent(new window.CustomEvent(`theme:${eventName}`, {
        detail: payload
      }));
      return;
    }

    if (typeof document.dispatch === 'function') {
      document.dispatch(`theme:${eventName}`, { detail: payload });
    }
  }

  const ThemeManager = {
    config: Object.assign({}, DEFAULT_CONFIG),
    currentTheme: 'light',
    updateTimer: null,
    initialized: false,
    toggleButton: null,
    mediaQueryList: null,

    init(config = {}) {
      if (this.initialized) {
        return this;
      }

      this.config = Object.assign({}, DEFAULT_CONFIG, this.readScriptConfig(), config || {});

      const savedTheme = this.getSavedTheme();
      if (savedTheme && this.config.enableManualOverride) {
        this.setTheme(savedTheme, { persist: true, emit: false });
      } else {
        this.applyAutomaticTheme({ emit: false });
      }

      this.startAutoUpdate();
      this.startPreferenceWatcher();
      this.ensureToggleButton();

      this.initialized = true;
      window.themeManager = this;
      dispatchThemeEvent('initialized', {
        theme: this.getTheme(),
        legacyTheme: this.getCurrentTheme()
      });
      return this;
    },

    readScriptConfig() {
      const script = document.currentScript;
      if (!script || !script.dataset) {
        return {};
      }

      const config = {};
      if (script.dataset.dayStart) config.dayStartHour = parseInt(script.dataset.dayStart, 10);
      if (script.dataset.nightStart) config.nightStartHour = parseInt(script.dataset.nightStart, 10);
      if (script.dataset.interval) config.autoUpdateInterval = parseInt(script.dataset.interval, 10);
      if (script.dataset.storageKey) config.storageKey = script.dataset.storageKey;
      if (script.dataset.manualOverride) config.enableManualOverride = script.dataset.manualOverride !== 'false';
      if (script.dataset.autoInit) config.autoInit = script.dataset.autoInit !== 'false';
      if (script.dataset.autoButton) config.autoButton = script.dataset.autoButton !== 'false';
      if (script.dataset.buttonSelector) config.buttonSelector = script.dataset.buttonSelector;
      return config;
    },

    getThemeByTime() {
      const now = new Date();
      const hour = now.getHours();
      const { dayStartHour, nightStartHour } = this.config;
      return (hour >= dayStartHour && hour < nightStartHour) ? 'light' : 'dark';
    },

    getAutomaticTheme() {
      if (canUseMatchMedia()) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return this.getThemeByTime();
    },

    applyAutomaticTheme(options = {}) {
      this.setTheme(this.getAutomaticTheme(), Object.assign({ persist: false }, options));
    },

    setTheme(theme, options = {}) {
      const normalizedTheme = normalizeTheme(theme);
      const persist = options.persist !== false;
      const emit = options.emit !== false;
      const oldTheme = this.currentTheme;

      this.currentTheme = normalizedTheme;
      document.documentElement.setAttribute('data-theme', normalizedTheme);

      if (persist && this.config.enableManualOverride) {
        this.saveTheme(normalizedTheme);
      } else if (!persist) {
        this.clearSavedThemeValue();
      }

      this.updateToggleButton();

      if (emit && oldTheme !== normalizedTheme) {
        dispatchThemeEvent('themeChanged', {
          oldTheme,
          newTheme: normalizedTheme,
          legacyOldTheme: oldTheme === 'dark' ? 'night' : 'day',
          legacyNewTheme: normalizedTheme === 'dark' ? 'night' : 'day',
          isManual: persist
        });
      }
      return normalizedTheme;
    },

    toggle() {
      const nextTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.setTheme(nextTheme, { persist: true });
      return this.currentTheme;
    },

    toggleTheme() {
      return this.toggle();
    },

    getTheme() {
      return this.currentTheme;
    },

    getCurrentTheme() {
      return this.currentTheme === 'dark' ? 'night' : 'day';
    },

    saveTheme(theme) {
      try {
        localStorage.setItem(this.config.storageKey, normalizeTheme(theme));
      } catch (error) {
        console.warn('Failed to save theme preference:', error);
      }
    },

    getSavedTheme() {
      try {
        const saved = localStorage.getItem(this.config.storageKey);
        return saved ? normalizeTheme(saved) : null;
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
        return null;
      }
    },

    clearSavedThemeValue() {
      try {
        localStorage.removeItem(this.config.storageKey);
      } catch (error) {
        console.warn('Failed to clear theme preference:', error);
      }
    },

    clearSavedTheme() {
      this.clearSavedThemeValue();
      this.applyAutomaticTheme({ persist: false });
    },

    startAutoUpdate() {
      this.stopAutoUpdate();
      if (this.config.autoUpdateInterval <= 0 || canUseMatchMedia()) {
        return;
      }
      this.updateTimer = setInterval(() => {
        if (!this.getSavedTheme()) {
          this.applyAutomaticTheme({ persist: false });
        }
      }, this.config.autoUpdateInterval);
    },

    stopAutoUpdate() {
      if (this.updateTimer) {
        clearInterval(this.updateTimer);
        this.updateTimer = null;
      }
    },

    startPreferenceWatcher() {
      if (!canUseMatchMedia()) {
        return;
      }
      this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
      if (typeof this.mediaQueryList.addEventListener === 'function') {
        this.mediaQueryList.addEventListener('change', (event) => {
          if (!this.getSavedTheme()) {
            this.setTheme(event.matches ? 'dark' : 'light', { persist: false });
          }
        });
      }
    },

    ensureToggleButton() {
      if (this.config.autoButton === false) {
        return;
      }

      const customButton = this.config.buttonSelector
        ? document.querySelector(this.config.buttonSelector)
        : null;

      if (customButton) {
        if (typeof customButton.addEventListener === 'function') {
          customButton.addEventListener('click', () => this.toggle());
        }
        this.toggleButton = customButton;
        this.updateToggleButton();
        return;
      }

      if (!document.body || this.toggleButton) {
        return;
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'theme-toggle-auto';
      button.setAttribute('aria-label', '切换主题');
      button.style.cssText = [
        'position: fixed',
        'top: 1rem',
        'right: 1rem',
        'z-index: 9999',
        'padding: 0.75rem 1rem',
        'border: 1px solid var(--border-color, #d0d0d0)',
        'border-radius: 8px',
        'background-color: var(--bg-secondary, #f5f5f5)',
        'color: var(--text-primary, #1a1a1a)',
        'cursor: pointer',
        'font-size: 0.95rem',
        'font-weight: 600',
        'box-shadow: 0 2px 8px var(--shadow-color, rgba(0, 0, 0, 0.15))'
      ].join(';');
      if (typeof button.addEventListener === 'function') {
        button.addEventListener('click', () => this.toggle());
      }
      document.body.appendChild(button);
      this.toggleButton = button;
      this.updateToggleButton();
    },

    updateToggleButton() {
      if (!this.toggleButton) {
        return;
      }

      const nextThemeLabel = this.currentTheme === 'dark' ? '切换到日间' : '切换到夜间';
      this.toggleButton.textContent = nextThemeLabel;
      if (this.toggleButton.dataset) {
        this.toggleButton.dataset.theme = this.currentTheme;
      }
    },

    destroy() {
      this.stopAutoUpdate();
      this.initialized = false;
      dispatchThemeEvent('destroyed', {
        theme: this.getTheme()
      });
    }
  };

  window.ThemeManager = ThemeManager;
  window.themeManager = ThemeManager;

  if (ThemeManager.config.autoInit !== false) {
    if (document.readyState && document.readyState !== 'loading') {
      ThemeManager.init();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        ThemeManager.init();
      });
    }
  }
})();
