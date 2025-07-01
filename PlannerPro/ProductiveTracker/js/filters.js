/**
 * Filter Manager - Handles task filtering, searching, and sorting functionality
 * Provides comprehensive filtering options for enhanced task organization
 */

class FilterManager {
    constructor() {
        this.filters = {
            search: '',
            priority: '',
            status: '',
            category: '',
            dateRange: {
                start: null,
                end: null
            },
            tags: []
        };
        this.sortBy = 'dueDate';
        this.sortOrder = 'asc';
        this.tasks = [];
        this.filteredTasks = [];
        this.storage = null;
        this.debounceTimer = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.applyFilters = this.applyFilters.bind(this);
        this.clearFilters = this.clearFilters.bind(this);
        this.handleSearchInput = this.handleSearchInput.bind(this);
    }

    /**
     * Initialize filter manager
     */
    async init() {
        try {
            // Get storage instance
            this.storage = window.plannerApp?.getComponent('storage') || new StorageManager();
            
            // Load tasks
            await this.loadTasks();
            
            // Load saved filters
            await this.loadSavedFilters();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup task update listener
            this.setupTaskUpdateListener();
            
            // Apply initial filters
            this.applyFilters();
            
            // Update category list
            this.updateCategoryList();
            
            console.log('✅ FilterManager initialized');
            
        } catch (error) {
            console.error('❌ FilterManager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Load tasks from storage
     */
    async loadTasks() {
        try {
            this.tasks = await this.storage.getAllTasks();
            this.filteredTasks = [...this.tasks];
        } catch (error) {
            console.error('❌ Failed to load tasks for filtering:', error);
            this.tasks = [];
            this.filteredTasks = [];
        }
    }

    /**
     * Load saved filters from storage
     */
    async loadSavedFilters() {
        try {
            if (this.storage) {
                const savedFilters = await this.storage.getSetting('filters', {});
                this.filters = { ...this.filters, ...savedFilters };
                this.populateFilterControls();
            }
        } catch (error) {
            console.error('❌ Failed to load saved filters:', error);
        }
    }

    /**
     * Save current filters to storage
     */
    async saveFilters() {
        try {
            if (this.storage) {
                await this.storage.setSetting('filters', this.filters);
            }
        } catch (error) {
            console.error('❌ Failed to save filters:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        try {
            // Search input
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.addEventListener('input', this.handleSearchInput);
                searchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.clearSearch();
                    }
                });
            }

            // Filter dropdowns
            const priorityFilter = document.getElementById('priority-filter');
            const statusFilter = document.getElementById('status-filter');
            const categoryFilter = document.getElementById('category-filter');

            if (priorityFilter) {
                priorityFilter.addEventListener('change', (e) => {
                    this.setFilter('priority', e.target.value);
                });
            }

            if (statusFilter) {
                statusFilter.addEventListener('change', (e) => {
                    this.setFilter('status', e.target.value);
                });
            }

            if (categoryFilter) {
                categoryFilter.addEventListener('change', (e) => {
                    this.setFilter('category', e.target.value);
                });
            }

            // Add clear filters button functionality
            this.addClearFiltersButton();

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !e.target.matches('input, textarea')) {
                    e.preventDefault();
                    this.focusSearch();
                }
            });

            console.log('✅ Filter event listeners setup');

        } catch (error) {
            console.error('❌ Failed to setup filter event listeners:', error);
        }
    }

    /**
     * Setup task update listener
     */
    setupTaskUpdateListener() {
        try {
            document.addEventListener('tasksUpdated', (e) => {
                this.tasks = e.detail.tasks || [];
                this.applyFilters();
                this.updateCategoryList();
            });
        } catch (error) {
            console.error('❌ Failed to setup task update listener:', error);
        }
    }

    /**
     * Handle search input with debouncing
     */
    handleSearchInput(e) {
        try {
            const searchTerm = e.target.value;
            
            // Clear previous debounce timer
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }
            
            // Set new debounce timer
            this.debounceTimer = setTimeout(() => {
                this.setFilter('search', searchTerm);
            }, 300);
            
        } catch (error) {
            console.error('❌ Failed to handle search input:', error);
        }
    }

    /**
     * Set a filter value
     */
    async setFilter(filterType, value) {
        try {
            if (filterType === 'dateRange') {
                this.filters.dateRange = { ...this.filters.dateRange, ...value };
            } else {
                this.filters[filterType] = value;
            }
            
            await this.saveFilters();
            this.applyFilters();
            this.triggerFilterChange();
            
            console.log(`✅ Filter ${filterType} set to:`, value);
            
        } catch (error) {
            console.error('❌ Failed to set filter:', error);
        }
    }

    /**
     * Apply all filters to tasks
     */
    applyFilters() {
        try {
            let filtered = [...this.tasks];
            
            // Apply search filter
            if (this.filters.search) {
                filtered = this.applySearchFilter(filtered, this.filters.search);
            }
            
            // Apply priority filter
            if (this.filters.priority) {
                filtered = filtered.filter(task => task.priority === this.filters.priority);
            }
            
            // Apply status filter
            if (this.filters.status) {
                filtered = this.applyStatusFilter(filtered, this.filters.status);
            }
            
            // Apply category filter
            if (this.filters.category) {
                filtered = filtered.filter(task => task.category === this.filters.category);
            }
            
            // Apply date range filter
            if (this.filters.dateRange.start || this.filters.dateRange.end) {
                filtered = this.applyDateRangeFilter(filtered, this.filters.dateRange);
            }
            
            // Apply tags filter
            if (this.filters.tags.length > 0) {
                filtered = this.applyTagsFilter(filtered, this.filters.tags);
            }
            
            // Sort filtered tasks
            filtered = this.sortTasks(filtered);
            
            this.filteredTasks = filtered;
            this.updateTaskDisplay();
            this.updateFilterStats();
            
        } catch (error) {
            console.error('❌ Failed to apply filters:', error);
        }
    }

    /**
     * Apply search filter
     */
    applySearchFilter(tasks, searchTerm) {
        try {
            const searchLower = searchTerm.toLowerCase().trim();
            if (!searchLower) return tasks;
            
            return tasks.filter(task => {
                // Search in title
                if (task.title && task.title.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Search in description
                if (task.description && task.description.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Search in tags
                if (task.tags && task.tags.some(tag => 
                    tag.toLowerCase().includes(searchLower)
                )) {
                    return true;
                }
                
                // Search in category
                if (task.category && task.category.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                return false;
            });
        } catch (error) {
            console.error('❌ Failed to apply search filter:', error);
            return tasks;
        }
    }

    /**
     * Apply status filter
     */
    applyStatusFilter(tasks, status) {
        try {
            switch (status) {
                case 'completed':
                    return tasks.filter(task => task.status === 'completed');
                case 'pending':
                    return tasks.filter(task => task.status !== 'completed');
                case 'overdue':
                    const today = new Date().toISOString().split('T')[0];
                    return tasks.filter(task => 
                        task.status !== 'completed' && 
                        task.dueDate && 
                        task.dueDate < today
                    );
                default:
                    return tasks;
            }
        } catch (error) {
            console.error('❌ Failed to apply status filter:', error);
            return tasks;
        }
    }

    /**
     * Apply date range filter
     */
    applyDateRangeFilter(tasks, dateRange) {
        try {
            return tasks.filter(task => {
                if (!task.dueDate) return false;
                
                const taskDate = new Date(task.dueDate);
                const startDate = dateRange.start ? new Date(dateRange.start) : null;
                const endDate = dateRange.end ? new Date(dateRange.end) : null;
                
                if (startDate && taskDate < startDate) return false;
                if (endDate && taskDate > endDate) return false;
                
                return true;
            });
        } catch (error) {
            console.error('❌ Failed to apply date range filter:', error);
            return tasks;
        }
    }

    /**
     * Apply tags filter
     */
    applyTagsFilter(tasks, tags) {
        try {
            return tasks.filter(task => {
                if (!task.tags || task.tags.length === 0) return false;
                return tags.every(tag => task.tags.includes(tag));
            });
        } catch (error) {
            console.error('❌ Failed to apply tags filter:', error);
            return tasks;
        }
    }

    /**
     * Sort tasks based on current sort settings
     */
    sortTasks(tasks) {
        try {
            return [...tasks].sort((a, b) => {
                let aValue, bValue;
                
                switch (this.sortBy) {
                    case 'title':
                        aValue = a.title.toLowerCase();
                        bValue = b.title.toLowerCase();
                        break;
                    case 'dueDate':
                        aValue = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
                        bValue = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
                        break;
                    case 'priority':
                        const priorityOrder = { high: 3, medium: 2, low: 1 };
                        aValue = priorityOrder[a.priority] || 2;
                        bValue = priorityOrder[b.priority] || 2;
                        break;
                    case 'createdAt':
                        aValue = new Date(a.createdAt);
                        bValue = new Date(b.createdAt);
                        break;
                    case 'status':
                        aValue = a.status === 'completed' ? 1 : 0;
                        bValue = b.status === 'completed' ? 1 : 0;
                        break;
                    default:
                        aValue = a.createdAt;
                        bValue = b.createdAt;
                }
                
                if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
                if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        } catch (error) {
            console.error('❌ Failed to sort tasks:', error);
            return tasks;
        }
    }

    /**
     * Set sort options
     */
    setSortBy(sortBy, sortOrder = 'asc') {
        try {
            this.sortBy = sortBy;
            this.sortOrder = sortOrder;
            this.applyFilters();
            
            console.log(`✅ Sort set to: ${sortBy} ${sortOrder}`);
        } catch (error) {
            console.error('❌ Failed to set sort options:', error);
        }
    }

    /**
     * Clear all filters
     */
    async clearFilters() {
        try {
            this.filters = {
                search: '',
                priority: '',
                status: '',
                category: '',
                dateRange: {
                    start: null,
                    end: null
                },
                tags: []
            };
            
            await this.saveFilters();
            this.populateFilterControls();
            this.applyFilters();
            this.triggerFilterChange();
            
            // Show notification
            NotificationManager.show('Filters Cleared', 'All filters have been reset', 'info');
            
            console.log('✅ All filters cleared');
            
        } catch (error) {
            console.error('❌ Failed to clear filters:', error);
        }
    }

    /**
     * Clear search filter
     */
    clearSearch() {
        try {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = '';
                this.setFilter('search', '');
            }
        } catch (error) {
            console.error('❌ Failed to clear search:', error);
        }
    }

    /**
     * Focus on search input
     */
    focusSearch() {
        try {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        } catch (error) {
            console.error('❌ Failed to focus search:', error);
        }
    }

    /**
     * Populate filter controls with current values
     */
    populateFilterControls() {
        try {
            // Search input
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = this.filters.search || '';
            }
            
            // Priority filter
            const priorityFilter = document.getElementById('priority-filter');
            if (priorityFilter) {
                priorityFilter.value = this.filters.priority || '';
            }
            
            // Status filter
            const statusFilter = document.getElementById('status-filter');
            if (statusFilter) {
                statusFilter.value = this.filters.status || '';
            }
            
            // Category filter
            const categoryFilter = document.getElementById('category-filter');
            if (categoryFilter) {
                categoryFilter.value = this.filters.category || '';
            }
            
        } catch (error) {
            console.error('❌ Failed to populate filter controls:', error);
        }
    }

    /**
     * Update task display
     */
    updateTaskDisplay() {
        try {
            // Trigger task list refresh
            const taskManager = window.plannerApp?.getComponent('tasks');
            if (taskManager) {
                taskManager.refreshTaskList();
            }
        } catch (error) {
            console.error('❌ Failed to update task display:', error);
        }
    }

    /**
     * Update filter statistics
     */
    updateFilterStats() {
        try {
            const totalTasks = this.tasks.length;
            const filteredCount = this.filteredTasks.length;
            
            // Update filter info display
            this.updateFilterInfo(totalTasks, filteredCount);
            
        } catch (error) {
            console.error('❌ Failed to update filter stats:', error);
        }
    }

    /**
     * Update filter info display
     */
    updateFilterInfo(total, filtered) {
        try {
            // Remove existing filter info
            const existingInfo = document.querySelector('.filter-info');
            if (existingInfo) {
                existingInfo.remove();
            }
            
            // Add filter info if filters are active
            if (this.hasActiveFilters() && filtered !== total) {
                const tasksHeader = document.querySelector('.tasks-header');
                if (tasksHeader) {
                    const filterInfo = document.createElement('div');
                    filterInfo.className = 'filter-info';
                    filterInfo.innerHTML = `
                        <span class="filter-count">Showing ${filtered} of ${total} tasks</span>
                        <button class="btn-secondary clear-filters-btn" onclick="filterManager.clearFilters()">
                            <i data-feather="x"></i>
                            Clear Filters
                        </button>
                    `;
                    tasksHeader.appendChild(filterInfo);
                    
                    // Re-initialize feather icons
                    if (typeof feather !== 'undefined') {
                        feather.replace(filterInfo);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Failed to update filter info:', error);
        }
    }

    /**
     * Check if any filters are active
     */
    hasActiveFilters() {
        try {
            return !!(
                this.filters.search ||
                this.filters.priority ||
                this.filters.status ||
                this.filters.category ||
                this.filters.dateRange.start ||
                this.filters.dateRange.end ||
                this.filters.tags.length > 0
            );
        } catch (error) {
            console.error('❌ Failed to check active filters:', error);
            return false;
        }
    }

    /**
     * Add clear filters button
     */
    addClearFiltersButton() {
        try {
            const tasksFilters = document.querySelector('.tasks-filters');
            if (tasksFilters && !tasksFilters.querySelector('.clear-all-btn')) {
                const clearBtn = document.createElement('button');
                clearBtn.className = 'btn-secondary clear-all-btn';
                clearBtn.innerHTML = '<i data-feather="filter-x"></i> Clear All';
                clearBtn.addEventListener('click', this.clearFilters);
                
                tasksFilters.appendChild(clearBtn);
                
                // Re-initialize feather icons
                if (typeof feather !== 'undefined') {
                    feather.replace(clearBtn);
                }
            }
        } catch (error) {
            console.error('❌ Failed to add clear filters button:', error);
        }
    }

    /**
     * Update category list in sidebar
     */
    updateCategoryList() {
        try {
            const categoryList = document.getElementById('category-list');
            if (!categoryList) return;
            
            // Get category counts
            const categories = {};
            this.tasks.forEach(task => {
                const category = task.category || 'uncategorized';
                categories[category] = (categories[category] || 0) + 1;
            });
            
            // Generate category HTML
            const categoryHTML = Object.entries(categories).map(([category, count]) => {
                const isActive = this.filters.category === category;
                return `
                    <div class="category-item ${isActive ? 'active' : ''}" 
                         onclick="filterManager.setFilter('category', '${isActive ? '' : category}')">
                        <div class="category-name">
                            <div class="category-color" style="background-color: ${this.getCategoryColor(category)}"></div>
                            <span>${category.charAt(0).toUpperCase() + category.slice(1)}</span>
                        </div>
                        <span class="category-count">${count}</span>
                    </div>
                `;
            }).join('');
            
            categoryList.innerHTML = categoryHTML;
            
        } catch (error) {
            console.error('❌ Failed to update category list:', error);
        }
    }

    /**
     * Get color for category
     */
    getCategoryColor(category) {
        const colors = {
            work: '#4F46E5',
            personal: '#10B981',
            health: '#F59E0B',
            education: '#7C3AED',
            shopping: '#EC4899',
            uncategorized: '#6B7280'
        };
        return colors[category] || colors.uncategorized;
    }

    /**
     * Trigger filter change event
     */
    triggerFilterChange() {
        try {
            const event = new CustomEvent('filtersChanged', {
                detail: {
                    filters: this.filters,
                    filteredTasks: this.filteredTasks,
                    sortBy: this.sortBy,
                    sortOrder: this.sortOrder
                }
            });
            
            document.dispatchEvent(event);
        } catch (error) {
            console.error('❌ Failed to trigger filter change event:', error);
        }
    }

    /**
     * Get filtered tasks
     */
    getFilteredTasks() {
        return [...this.filteredTasks];
    }

    /**
     * Get filter statistics
     */
    getFilterStatistics() {
        try {
            return {
                totalTasks: this.tasks.length,
                filteredTasks: this.filteredTasks.length,
                activeFilters: this.hasActiveFilters(),
                filters: { ...this.filters },
                sortBy: this.sortBy,
                sortOrder: this.sortOrder
            };
        } catch (error) {
            console.error('❌ Failed to get filter statistics:', error);
            return null;
        }
    }

    /**
     * Refresh filters
     */
    refresh() {
        try {
            this.applyFilters();
            this.updateCategoryList();
        } catch (error) {
            console.error('❌ Failed to refresh filters:', error);
        }
    }

    /**
     * Export filter settings
     */
    exportFilters() {
        try {
            return {
                filters: this.filters,
                sortBy: this.sortBy,
                sortOrder: this.sortOrder
            };
        } catch (error) {
            console.error('❌ Failed to export filters:', error);
            return null;
        }
    }

    /**
     * Import filter settings
     */
    async importFilters(filterData) {
        try {
            if (filterData.filters) {
                this.filters = { ...this.filters, ...filterData.filters };
            }
            
            if (filterData.sortBy) {
                this.sortBy = filterData.sortBy;
            }
            
            if (filterData.sortOrder) {
                this.sortOrder = filterData.sortOrder;
            }
            
            await this.saveFilters();
            this.populateFilterControls();
            this.applyFilters();
            
            console.log('✅ Filters imported successfully');
        } catch (error) {
            console.error('❌ Failed to import filters:', error);
        }
    }
}

// Add CSS for filter components
const filterCSS = `
.filter-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    margin-top: 1rem;
    font-size: 0.875rem;
}

.filter-count {
    color: var(--text-secondary);
}

.clear-filters-btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
}

.clear-all-btn {
    white-space: nowrap;
}

.category-item {
    cursor: pointer;
    transition: all 0.2s ease;
}

.category-item:hover:not(.active) {
    background-color: var(--bg-tertiary);
}

.category-item.active {
    background-color: var(--primary-color);
    color: white;
    transform: translateX(4px);
}

.category-item.active .category-count {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
}

.tasks-filters {
    gap: 1rem;
    align-items: center;
    flex-wrap: wrap;
}

@media (max-width: 768px) {
    .filter-info {
        flex-direction: column;
        gap: 0.5rem;
        align-items: stretch;
    }
    
    .clear-filters-btn {
        width: 100%;
        justify-content: center;
    }
    
    .tasks-filters {
        gap: 0.75rem;
    }
}

/* Search input focus state */
.search-box input:focus {
    transform: scale(1.02);
}

/* Filter dropdown styles */
.tasks-filters select:focus {
    transform: scale(1.02);
}

/* Animation for filter changes */
.task-list {
    transition: opacity 0.2s ease;
}

.task-list.filtering {
    opacity: 0.7;
}
`;

// Inject filter CSS
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = filterCSS;
    document.head.appendChild(style);
}

// Make FilterManager globally available
if (typeof window !== 'undefined') {
    window.FilterManager = FilterManager;
    
    // Create global instance for easy access from HTML
    window.filterManager = null;
    
    // Initialize when app is ready
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.filterManager) {
            window.filterManager = new FilterManager();
        }
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterManager;
}
