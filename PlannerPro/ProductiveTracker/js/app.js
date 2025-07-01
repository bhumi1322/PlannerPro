/**
 * Main Application Controller
 * Handles application initialization, navigation, and global event coordination
 */

class PlannerApp {
    constructor() {
        this.currentView = 'calendar';
        this.isInitialized = false;
        this.components = {};
        
        // Bind methods
        this.init = this.init.bind(this);
        this.switchView = this.switchView.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleKeyboard = this.handleKeyboard.bind(this);
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            this.showLoading(true);
            
            // Initialize Feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
            
            // Initialize core components
            await this.initializeComponents();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Initialize default view
            this.switchView(this.currentView);
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Show success notification
            NotificationManager.show('Welcome to PlannerPro!', 'Application loaded successfully', 'success');
            
            console.log('✅ PlannerApp initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize PlannerApp:', error);
            NotificationManager.show('Initialization Error', 'Failed to load the application. Please refresh the page.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Initialize all application components
     */
    async initializeComponents() {
        try {
            // Initialize storage first
            this.components.storage = new StorageManager();
            await this.components.storage.init();
            
            // Initialize theme manager
            this.components.themes = new ThemeManager();
            await this.components.themes.init();
            
            // Initialize notification manager
            this.components.notifications = new NotificationManager();
            
            // Initialize task manager
            this.components.tasks = new TaskManager();
            await this.components.tasks.init();
            
            // Initialize calendar
            this.components.calendar = new CalendarManager();
            await this.components.calendar.init();
            
            // Initialize drag and drop
            this.components.dragDrop = new DragDropManager();
            await this.components.dragDrop.init();
            
            // Initialize statistics
            this.components.statistics = new StatisticsManager();
            await this.components.statistics.init();
            
            // Initialize filters
            this.components.filters = new FilterManager();
            await this.components.filters.init();
            
            // Initialize expenses
            this.components.expenses = new ExpenseManager();
            await this.components.expenses.init();
            
            console.log('✅ All components initialized');
            
        } catch (error) {
            console.error('❌ Component initialization failed:', error);
            throw error;
        }
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Navigation tabs
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.tab;
                this.switchView(view);
            });
        });

        // Add task button
        const addTaskBtn = document.getElementById('add-task-btn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => {
                this.components.tasks.openTaskModal();
            });
        }

        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openSettings();
            });
        }

        // Theme toggle button
        const themeToggleBtn = document.getElementById('theme-toggle');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                this.components.themes.toggleTheme();
            });
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard);

        // Window resize handler
        window.addEventListener('resize', this.handleResize);

        // Prevent default drag behavior on images and links
        document.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'IMG' || e.target.tagName === 'A') {
                e.preventDefault();
            }
        });

        // Handle page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.components.notifications) {
                this.components.notifications.checkOverdueTasks();
            }
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            NotificationManager.show('Connection Restored', 'You are back online!', 'success');
        });

        window.addEventListener('offline', () => {
            NotificationManager.show('Connection Lost', 'You are now offline. Data will be saved locally.', 'warning');
        });

        // Handle unload to save data
        window.addEventListener('beforeunload', () => {
            if (this.components.storage) {
                this.components.storage.saveAll();
            }
        });

        console.log('✅ Event listeners set up');
    }

    /**
     * Load initial application data
     */
    async loadInitialData() {
        try {
            // Load tasks and refresh displays
            if (this.components.tasks) {
                await this.components.tasks.loadTasks();
            }
            
            // Update calendar with tasks
            if (this.components.calendar) {
                this.components.calendar.refresh();
            }
            
            // Update statistics
            if (this.components.statistics) {
                this.components.statistics.refresh();
            }
            
            // Update filters
            if (this.components.filters) {
                this.components.filters.refresh();
            }
            
            // Add initial page animations
            this.animateInitialLoad();
            
            console.log('✅ Initial data loaded');
            
        } catch (error) {
            console.error('❌ Failed to load initial data:', error);
            throw error;
        }
    }

    /**
     * Switch between application views
     */
    switchView(viewName) {
        if (!viewName || viewName === this.currentView) return;

        try {
            // Hide all view sections
            const allViews = document.querySelectorAll('.view-section');
            allViews.forEach(view => {
                view.classList.remove('active');
            });

            // Show target view
            const targetView = document.getElementById(`${viewName}-view`);
            if (targetView) {
                targetView.classList.add('active');
            }

            // Update navigation tabs
            const allTabs = document.querySelectorAll('.nav-tab');
            allTabs.forEach(tab => {
                tab.classList.remove('active');
            });

            const activeTab = document.querySelector(`[data-tab="${viewName}"]`);
            if (activeTab) {
                activeTab.classList.add('active');
            }

            // Update current view
            this.currentView = viewName;

            // Trigger view-specific updates
            this.onViewChanged(viewName);

            // Animate view transition with GSAP
            if (typeof gsap !== 'undefined' && targetView) {
                gsap.fromTo(targetView, 
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
                );
            }

            console.log(`✅ Switched to ${viewName} view`);

        } catch (error) {
            console.error(`❌ Failed to switch to ${viewName} view:`, error);
        }
    }

    /**
     * Handle view change events
     */
    onViewChanged(viewName) {
        try {
            switch (viewName) {
                case 'calendar':
                    if (this.components.calendar) {
                        this.components.calendar.refresh();
                    }
                    break;

                case 'tasks':
                    if (this.components.tasks) {
                        this.components.tasks.refreshTaskList();
                    }
                    if (this.components.filters) {
                        this.components.filters.refresh();
                    }
                    break;

                case 'stats':
                    if (this.components.statistics) {
                        this.components.statistics.refresh();
                        this.components.statistics.updateCharts();
                    }
                    break;
            }
        } catch (error) {
            console.error(`❌ Error handling view change to ${viewName}:`, error);
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        // Don't handle shortcuts when typing in inputs
        if (e.target.matches('input, textarea, select')) return;

        try {
            // Check for modifier keys
            const isCtrl = e.ctrlKey || e.metaKey;
            const isShift = e.shiftKey;

            switch (e.key) {
                case 'n':
                case 'N':
                    if (isCtrl) {
                        e.preventDefault();
                        this.components.tasks?.openTaskModal();
                    }
                    break;

                case '1':
                    if (isCtrl) {
                        e.preventDefault();
                        this.switchView('calendar');
                    }
                    break;

                case '2':
                    if (isCtrl) {
                        e.preventDefault();
                        this.switchView('tasks');
                    }
                    break;

                case '3':
                    if (isCtrl) {
                        e.preventDefault();
                        this.switchView('stats');
                    }
                    break;

                case 't':
                case 'T':
                    if (isCtrl && isShift) {
                        e.preventDefault();
                        this.components.themes?.toggleTheme();
                    }
                    break;

                case 'Escape':
                    this.closeAllModals();
                    break;

                case 'ArrowLeft':
                    if (this.currentView === 'calendar' && isCtrl) {
                        e.preventDefault();
                        this.components.calendar?.previousMonth();
                    }
                    break;

                case 'ArrowRight':
                    if (this.currentView === 'calendar' && isCtrl) {
                        e.preventDefault();
                        this.components.calendar?.nextMonth();
                    }
                    break;

                case 'Home':
                    if (this.currentView === 'calendar' && isCtrl) {
                        e.preventDefault();
                        this.components.calendar?.goToToday();
                    }
                    break;

                case 'f':
                case 'F':
                    if (isCtrl) {
                        e.preventDefault();
                        const searchInput = document.getElementById('search-input');
                        if (searchInput) {
                            searchInput.focus();
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('❌ Keyboard shortcut error:', error);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        try {
            // Debounce resize events
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                // Update calendar layout
                if (this.components.calendar) {
                    this.components.calendar.handleResize();
                }

                // Update charts
                if (this.components.statistics && this.currentView === 'stats') {
                    this.components.statistics.resizeCharts();
                }

                // Check if we need to switch to mobile layout
                this.updateMobileLayout();

            }, 250);
        } catch (error) {
            console.error('❌ Resize handler error:', error);
        }
    }

    /**
     * Update layout based on screen size
     */
    updateMobileLayout() {
        try {
            const isMobile = window.innerWidth <= 768;
            document.body.classList.toggle('mobile-layout', isMobile);

            // Update calendar view for mobile
            if (isMobile && this.components.calendar) {
                this.components.calendar.setMobileMode(true);
            } else if (this.components.calendar) {
                this.components.calendar.setMobileMode(false);
            }

        } catch (error) {
            console.error('❌ Mobile layout update error:', error);
        }
    }

    /**
     * Open settings modal
     */
    openSettings() {
        try {
            const settingsModal = document.getElementById('settings-modal-overlay');
            if (settingsModal) {
                settingsModal.classList.add('active');
                
                // Focus on first setting
                const firstSetting = settingsModal.querySelector('select, input');
                if (firstSetting) {
                    firstSetting.focus();
                }

                // Setup settings event listeners
                this.setupSettingsEventListeners();
            }
        } catch (error) {
            console.error('❌ Failed to open settings:', error);
        }
    }

    /**
     * Setup settings modal event listeners
     */
    setupSettingsEventListeners() {
        try {
            const settingsModal = document.getElementById('settings-modal-overlay');
            const closeBtn = document.getElementById('close-settings');
            
            // Close button
            if (closeBtn) {
                closeBtn.onclick = () => this.closeSettings();
            }

            // Close on overlay click
            if (settingsModal) {
                settingsModal.onclick = (e) => {
                    if (e.target === settingsModal) {
                        this.closeSettings();
                    }
                };
            }

            // Theme select
            const themeSelect = document.getElementById('theme-select');
            if (themeSelect) {
                themeSelect.onchange = (e) => {
                    this.components.themes?.setTheme(e.target.value);
                };
            }

            // Accent color
            const accentColor = document.getElementById('accent-color');
            if (accentColor) {
                accentColor.onchange = (e) => {
                    this.components.themes?.setAccentColor(e.target.value);
                };
            }

            // Other settings
            this.setupDataManagementListeners();

        } catch (error) {
            console.error('❌ Settings event listener error:', error);
        }
    }

    /**
     * Setup data management event listeners
     */
    setupDataManagementListeners() {
        try {
            // Export data
            const exportBtn = document.getElementById('export-data');
            if (exportBtn) {
                exportBtn.onclick = () => this.exportData();
            }

            // Import data
            const importBtn = document.getElementById('import-data');
            if (importBtn) {
                importBtn.onclick = () => this.importData();
            }

            // Clear data
            const clearBtn = document.getElementById('clear-data');
            if (clearBtn) {
                clearBtn.onclick = () => this.clearAllData();
            }

        } catch (error) {
            console.error('❌ Data management listener error:', error);
        }
    }

    /**
     * Close settings modal
     */
    closeSettings() {
        try {
            const settingsModal = document.getElementById('settings-modal-overlay');
            if (settingsModal) {
                settingsModal.classList.remove('active');
            }
        } catch (error) {
            console.error('❌ Failed to close settings:', error);
        }
    }

    /**
     * Close all open modals
     */
    closeAllModals() {
        try {
            const modals = document.querySelectorAll('.modal-overlay');
            modals.forEach(modal => {
                modal.classList.remove('active');
            });
        } catch (error) {
            console.error('❌ Failed to close modals:', error);
        }
    }

    /**
     * Export application data
     */
    async exportData() {
        try {
            const data = await this.components.storage.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `plannerpro-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            NotificationManager.show('Export Successful', 'Your data has been exported successfully', 'success');
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            NotificationManager.show('Export Failed', 'Failed to export data', 'error');
        }
    }

    /**
     * Import application data
     */
    async importData() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    
                    await this.components.storage.importData(data);
                    await this.loadInitialData();
                    
                    NotificationManager.show('Import Successful', 'Your data has been imported successfully', 'success');
                    
                } catch (error) {
                    console.error('❌ Import failed:', error);
                    NotificationManager.show('Import Failed', 'Failed to import data. Please check the file format.', 'error');
                }
            };
            
            input.click();
            
        } catch (error) {
            console.error('❌ Import setup failed:', error);
        }
    }

    /**
     * Clear all application data
     */
    async clearAllData() {
        try {
            const confirmed = confirm('Are you sure you want to clear all data? This action cannot be undone.');
            if (!confirmed) return;
            
            await this.components.storage.clearAll();
            await this.loadInitialData();
            
            NotificationManager.show('Data Cleared', 'All data has been cleared successfully', 'info');
            
        } catch (error) {
            console.error('❌ Clear data failed:', error);
            NotificationManager.show('Clear Failed', 'Failed to clear data', 'error');
        }
    }

    /**
     * Show/hide loading overlay
     */
    showLoading(show) {
        try {
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.toggle('active', show);
            }
        } catch (error) {
            console.error('❌ Loading overlay error:', error);
        }
    }

    /**
     * Get component instance
     */
    getComponent(name) {
        return this.components[name];
    }

    /**
     * Check if application is ready
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Animate initial page load with staggered animations
     */
    animateInitialLoad() {
        try {
            // Animate header elements
            const headerElements = document.querySelectorAll('.header .logo, .nav-tabs .nav-tab, .header-controls > *');
            headerElements.forEach((element, index) => {
                element.style.opacity = '0';
                element.style.transform = 'translateY(-20px)';
                element.classList.add('animate-fade-in-up');
                element.style.animationDelay = `${index * 0.1}s`;
                element.style.animationFillMode = 'forwards';
            });

            // Animate main content areas
            const contentElements = document.querySelectorAll('.view-section.active .calendar-container, .view-section.active .tasks-sidebar, .view-section.active .tasks-main, .view-section.active .stats-grid');
            contentElements.forEach((element, index) => {
                element.style.opacity = '0';
                element.style.transform = 'translateY(30px)';
                element.classList.add('animate-fade-in-up');
                element.style.animationDelay = `${(index + 3) * 0.2}s`;
                element.style.animationFillMode = 'forwards';
            });

            // Add stagger animation class to task list and calendar
            const taskList = document.getElementById('task-list');
            if (taskList) {
                taskList.classList.add('stagger-animation');
            }

            const calendarGrid = document.querySelector('.calendar-grid');
            if (calendarGrid) {
                const calendarDays = calendarGrid.querySelectorAll('.calendar-day');
                calendarDays.forEach((day, index) => {
                    day.style.setProperty('--animation-delay', index);
                });
            }

            // Animate category items
            const categoryItems = document.querySelectorAll('.category-item');
            categoryItems.forEach((item, index) => {
                item.style.setProperty('--animation-delay', index);
            });

            // Add floating animation to logo
            const logo = document.querySelector('.logo');
            if (logo) {
                setTimeout(() => {
                    logo.classList.add('animate-float');
                }, 1000);
            }

        } catch (error) {
            console.error('❌ Failed to animate initial load:', error);
        }
    }
}

// Global app instance
let app;

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        app = new PlannerApp();
        await app.init();
        
        // Make app globally available for debugging
        window.plannerApp = app;
        
    } catch (error) {
        console.error('❌ Failed to start application:', error);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <h2>Application Error</h2>
            <p>Failed to load PlannerPro. Please refresh the page to try again.</p>
            <button onclick="location.reload()">Refresh Page</button>
        `;
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
            z-index: 10000;
        `;
        
        document.body.appendChild(errorDiv);
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlannerApp;
}
