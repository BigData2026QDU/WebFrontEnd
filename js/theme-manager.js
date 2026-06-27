const ThemeManager = {
    currentTheme: 'light',
    storageKey: 'theme',
    
    init() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            this.setTheme(saved);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light', { persist: false });
        }
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(this.storageKey)) {
                this.setTheme(e.matches ? 'dark' : 'light', { persist: false });
            }
        });
    },
    
    setTheme(theme, options = {}) {
        const { persist = true } = options;
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        if (persist) {
            localStorage.setItem(this.storageKey, theme);
        } else {
            localStorage.removeItem(this.storageKey);
        }
    },
    
    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },
    
    getTheme() {
        return this.currentTheme;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});
