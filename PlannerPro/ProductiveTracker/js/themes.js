/**
 * Theme Manager - Handles theme switching, custom colors, and user preferences
 * Supports multiple themes and custom accent colors with smooth transitions
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.customAccentColor = '#4F46E5';
        this.availableThemes = ['light', 'dark', 'blue', 'green', 'purple'];
        this.storage = null;
        this.isDarkModePreferred = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.setTheme = this.setTheme.bind(this);
        this.toggleTheme = this.toggleTheme.bind(this);
        this.handleSystemThemeChange = this.handleSystemThemeChange.bind(this);
    }

    /**
     * Initialize theme manager
     */
    async init() {
        try {
            // Get storage instance from global app
            this.storage = window.plannerApp?.getComponent('storage') || new StorageManager();
            
            // Detect system preference
            this.detectSystemPreference();
            
            // Load saved theme
            await this.loadSavedTheme();
            
            // Setup system theme change listener
            this.setupSystemThemeListener();
            
            // Setup theme controls
            this.setupThemeControls();
            
            // Apply initial theme
            this.applyTheme(this.currentTheme);
            
            console.log('✅ ThemeManager initialized');
            
        } catch (error) {
            console.error('❌ ThemeManager initialization failed:', error);
            // Apply default theme even if initialization fails
            this.applyTheme('light');
        }
    }

    /**
     * Detect system dark mode preference
     */
    detectSystemPreference() {
        try {
            this.isDarkModePreferred = window.matchMedia && 
                window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            console.log(`System preference: ${this.isDarkModePreferred ? 'dark' : 'light'}`);
        } catch (error) {
            console.error('❌ Failed to detect system preference:', error);
        }
    }

    /**
     * Load saved theme from storage
     */
    async loadSavedTheme() {
        try {
            if (this.storage) {
                const savedTheme = await this.storage.getSetting('theme');
                const savedAccentColor = await this.storage.getSetting('accentColor');
                
                if (savedTheme && this.availableThemes.includes(savedTheme)) {
                    this.currentTheme = savedTheme;
                } else {
                    // Use system preference if no saved theme
                    this.currentTheme = this.isDarkModePreferred ? 'dark' : 'light';
                }
                
                if (savedAccentColor) {
                    this.customAccentColor = savedAccentColor;
                }
            }
        } catch (error) {
            console.error('❌ Failed to load saved theme:', error);
            this.currentTheme = 'light';
        }
    }

    /**
     * Setup system theme change listener
     */
    setupSystemThemeListener() {
        try {
            if (window.matchMedia) {
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                mediaQuery.addEventListener('change', this.handleSystemThemeChange);
            }
        } catch (error) {
            console.error('❌ Failed to setup system theme listener:', error);
        }
    }

    /**
     * Handle system theme change
     */
    handleSystemThemeChange(e) {
        try {
            this.isDarkModePreferred = e.matches;
            
            // Only auto-switch if user hasn't set a specific theme
            if (!this.storage || !this.storage.getSetting('theme')) {
                const newTheme = this.isDarkModePreferred ? 'dark' : 'light';
                this.setTheme(newTheme);
            }
        } catch (error) {
            console.error('❌ Failed to handle system theme change:', error);
        }
    }

    /**
     * Setup theme control elements
     */
    setupThemeControls() {
        try {
            // Theme toggle button
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', this.toggleTheme);
                this.updateThemeToggleIcon();
            }

            // Theme select dropdown in settings
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) {
                themeSelect.value = this.currentTheme;
                themeSelect.addEventListener('change', (e) => {
                    this.setTheme(e.target.value);
                });
            }

            // Accent color picker
            const accentColorPicker = document.getElementById('accent-color');
            if (accentColorPicker) {
                accentColorPicker.value = this.customAccentColor;
                accentColorPicker.addEventListener('change', (e) => {
                    this.setAccentColor(e.target.value);
                });
            }

            console.log('✅ Theme controls setup complete');

        } catch (error) {
            console.error('❌ Failed to setup theme controls:', error);
        }
    }

    /**
     * Set theme
     */
    async setTheme(themeName) {
        try {
            if (!this.availableThemes.includes(themeName)) {
                console.warn(`⚠️ Unknown theme: ${themeName}`);
                return;
            }

            const previousTheme = this.currentTheme;
            this.currentTheme = themeName;

            // Apply theme to DOM
            this.applyTheme(themeName);

            // Save to storage
            if (this.storage) {
                await this.storage.setSetting('theme', themeName);
            }

            // Update controls
            this.updateThemeControls();

            // Show theme indicator temporarily
            this.showThemeIndicator(themeName);

            // Trigger theme change event
            this.dispatchThemeChangeEvent(previousTheme, themeName);

            console.log(`✅ Theme changed to: ${themeName}`);

        } catch (error) {
            console.error('❌ Failed to set theme:', error);
        }
    }

    /**
     * Apply theme to DOM
     */
    applyTheme(themeName) {
        try {
            // Remove existing theme classes
            document.documentElement.removeAttribute('data-theme');
            
            // Add new theme
            document.documentElement.setAttribute('data-theme', themeName);

            // Apply custom accent color if set
            if (this.customAccentColor && this.customAccentColor !== '#4F46E5') {
                this.applyAccentColor(this.customAccentColor);
            }

            // Update meta theme-color for mobile browsers
            this.updateMetaThemeColor(themeName);

            // Add transition class for smooth theme switching
            document.body.classList.add('theme-transitioning');
            setTimeout(() => {
                document.body.classList.remove('theme-transitioning');
            }, 300);

        } catch (error) {
            console.error('❌ Failed to apply theme:', error);
        }
    }

    /**
     * Update meta theme color for mobile browsers
     */
    updateMetaThemeColor(themeName) {
        try {
            let themeColor = '#4F46E5'; // Default

            switch (themeName) {
                case 'dark':
                    themeColor = '#111827';
                    break;
                case 'blue':
                    themeColor = '#0EA5E9';
                    break;
                case 'green':
                    themeColor = '#059669';
                    break;
                case 'purple':
                    themeColor = '#7C3AED';
                    break;
                case 'light':
                default:
                    themeColor = '#FFFFFF';
                    break;
            }

            // Update or create meta theme-color tag
            let metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (!metaThemeColor) {
                metaThemeColor = document.createElement('meta');
                metaThemeColor.name = 'theme-color';
                document.head.appendChild(metaThemeColor);
            }
            metaThemeColor.content = themeColor;

        } catch (error) {
            console.error('❌ Failed to update meta theme color:', error);
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        try {
            const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
        } catch (error) {
            console.error('❌ Failed to toggle theme:', error);
        }
    }

    /**
     * Set custom accent color
     */
    async setAccentColor(color) {
        try {
            this.customAccentColor = color;
            this.applyAccentColor(color);

            // Save to storage
            if (this.storage) {
                await this.storage.setSetting('accentColor', color);
            }

            // Update color picker
            const accentColorPicker = document.getElementById('accent-color');
            if (accentColorPicker) {
                accentColorPicker.value = color;
            }

            console.log(`✅ Accent color changed to: ${color}`);

        } catch (error) {
            console.error('❌ Failed to set accent color:', error);
        }
    }

    /**
     * Apply custom accent color
     */
    applyAccentColor(color) {
        try {
            document.documentElement.style.setProperty('--custom-accent', color);
            document.documentElement.style.setProperty('--primary-color', color);
            
            // Calculate hover color (slightly darker)
            const hoverColor = this.adjustColorBrightness(color, -20);
            document.documentElement.style.setProperty('--primary-hover', hoverColor);

        } catch (error) {
            console.error('❌ Failed to apply accent color:', error);
        }
    }

    /**
     * Adjust color brightness
     */
    adjustColorBrightness(color, amount) {
        try {
            const usePound = color[0] === '#';
            const col = usePound ? color.slice(1) : color;
            
            const num = parseInt(col, 16);
            let r = (num >> 16) + amount;
            let g = (num >> 8 & 0x00FF) + amount;
            let b = (num & 0x0000FF) + amount;
            
            r = r > 255 ? 255 : r < 0 ? 0 : r;
            g = g > 255 ? 255 : g < 0 ? 0 : g;
            b = b > 255 ? 255 : b < 0 ? 0 : b;
            
            return (usePound ? '#' : '') + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
        } catch (error) {
            console.error('❌ Failed to adjust color brightness:', error);
            return color;
        }
    }

    /**
     * Update theme controls
     */
    updateThemeControls() {
        try {
            // Update theme toggle icon
            this.updateThemeToggleIcon();

            // Update theme select
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) {
                themeSelect.value = this.currentTheme;
            }

        } catch (error) {
            console.error('❌ Failed to update theme controls:', error);
        }
    }

    /**
     * Update theme toggle icon
     */
    updateThemeToggleIcon() {
        try {
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                const icon = themeToggle.querySelector('i');
                if (icon) {
                    // Remove existing icon classes
                    icon.setAttribute('data-feather', this.currentTheme === 'dark' ? 'sun' : 'moon');
                    
                    // Re-initialize feather icons
                    if (typeof feather !== 'undefined') {
                        feather.replace();
                    }
                }
            }
        } catch (error) {
            console.error('❌ Failed to update theme toggle icon:', error);
        }
    }

    /**
     * Show theme indicator
     */
    showThemeIndicator(themeName) {
        try {
            // Remove existing indicator
            const existingIndicator = document.querySelector('.theme-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }

            // Create new indicator
            const indicator = document.createElement('div');
            indicator.className = 'theme-indicator';
            indicator.textContent = `Theme: ${themeName.charAt(0).toUpperCase() + themeName.slice(1)}`;
            
            document.body.appendChild(indicator);

            // Show indicator
            setTimeout(() => {
                indicator.classList.add('show');
            }, 100);

            // Hide indicator after 2 seconds
            setTimeout(() => {
                indicator.classList.remove('show');
                setTimeout(() => {
                    if (indicator.parentNode) {
                        indicator.parentNode.removeChild(indicator);
                    }
                }, 300);
            }, 2000);

        } catch (error) {
            console.error('❌ Failed to show theme indicator:', error);
        }
    }

    /**
     * Dispatch theme change event
     */
    dispatchThemeChangeEvent(previousTheme, newTheme) {
        try {
            const event = new CustomEvent('themeChanged', {
                detail: {
                    previousTheme,
                    newTheme,
                    accentColor: this.customAccentColor
                }
            });
            
            document.dispatchEvent(event);
        } catch (error) {
            console.error('❌ Failed to dispatch theme change event:', error);
        }
    }

    /**
     * Get current theme info
     */
    getCurrentTheme() {
        return {
            name: this.currentTheme,
            accentColor: this.customAccentColor,
            isDark: this.currentTheme === 'dark',
            isSystemDarkMode: this.isDarkModePreferred
        };
    }

    /**
     * Reset to default theme
     */
    async resetToDefault() {
        try {
            await this.setTheme('light');
            await this.setAccentColor('#4F46E5');
            
            console.log('✅ Theme reset to default');
        } catch (error) {
            console.error('❌ Failed to reset theme:', error);
        }
    }

    /**
     * Export theme settings
     */
    exportThemeSettings() {
        return {
            theme: this.currentTheme,
            accentColor: this.customAccentColor
        };
    }

    /**
     * Import theme settings
     */
    async importThemeSettings(settings) {
        try {
            if (settings.theme) {
                await this.setTheme(settings.theme);
            }
            
            if (settings.accentColor) {
                await this.setAccentColor(settings.accentColor);
            }
            
            console.log('✅ Theme settings imported');
        } catch (error) {
            console.error('❌ Failed to import theme settings:', error);
        }
    }

    /**
     * Get available themes
     */
    getAvailableThemes() {
        return this.availableThemes.map(theme => ({
            value: theme,
            label: theme.charAt(0).toUpperCase() + theme.slice(1),
            isDark: theme === 'dark'
        }));
    }

    /**
     * Check if current theme is dark
     */
    isDarkTheme() {
        return this.currentTheme === 'dark';
    }

    /**
     * Auto-switch theme based on time
     */
    enableAutoThemeSwitch() {
        try {
            const checkTime = () => {
                const hour = new Date().getHours();
                const shouldBeDark = hour < 6 || hour > 18;
                const targetTheme = shouldBeDark ? 'dark' : 'light';
                
                if (targetTheme !== this.currentTheme) {
                    this.setTheme(targetTheme);
                }
            };

            // Check immediately
            checkTime();

            // Check every hour
            setInterval(checkTime, 60 * 60 * 1000);

            console.log('✅ Auto theme switch enabled');
        } catch (error) {
            console.error('❌ Failed to enable auto theme switch:', error);
        }
    }
}

// CSS for theme transitions
const themeTransitionCSS = `
.theme-transitioning * {
    transition: background-color 0.3s ease, 
                border-color 0.3s ease, 
                color 0.3s ease,
                box-shadow 0.3s ease !important;
}

.theme-indicator {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
    z-index: var(--z-tooltip);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
    pointer-events: none;
}

.theme-indicator.show {
    opacity: 1;
    transform: translateY(0);
}
`;

// Inject theme transition CSS
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = themeTransitionCSS;
    document.head.appendChild(style);
}

// Make ThemeManager globally available
if (typeof window !== 'undefined') {
    window.ThemeManager = ThemeManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
