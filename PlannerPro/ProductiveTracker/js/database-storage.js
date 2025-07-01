/**
 * Database Storage Manager - Handles data persistence using PostgreSQL database
 * Provides a unified interface for storing tasks, settings, and user preferences
 */

class DatabaseStorageManager {
    constructor() {
        this.apiBase = '/api'; // API endpoint base
        this.isOnline = navigator.onLine;
        this.pendingOperations = [];
        
        // Fallback to localStorage when offline
        this.localStorageKeys = {
            TASKS: 'plannerpro_tasks',
            SETTINGS: 'plannerpro_settings',
            STATISTICS: 'plannerpro_statistics',
            EXPENSES: 'plannerpro_expenses',
            PENDING_OPS: 'plannerpro_pending_ops'
        };

        // Setup online/offline listeners
        this.setupConnectivityListeners();
    }

    /**
     * Initialize storage system
     */
    async init() {
        try {
            // Check if database API is available
            const isDbAvailable = await this.checkDatabaseConnection();
            
            if (isDbAvailable) {
                console.log('✅ Database connection established');
                // Process any pending offline operations
                await this.syncPendingOperations();
            } else {
                console.log('⚠️ Database unavailable, using localStorage fallback');
            }
            
            console.log('✅ DatabaseStorageManager initialized');
            
        } catch (error) {
            console.error('❌ DatabaseStorageManager initialization failed:', error);
            console.log('📱 Falling back to localStorage');
        }
    }

    /**
     * Setup connectivity event listeners
     */
    setupConnectivityListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingOperations();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * Check if database connection is available
     */
    async checkDatabaseConnection() {
        try {
            const response = await fetch(`${this.apiBase}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Make API request to database
     */
    async makeApiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            // If online but API fails, add to pending operations
            if (this.isOnline && options.method !== 'GET') {
                this.addPendingOperation(endpoint, options);
            }
            throw error;
        }
    }

    /**
     * Add operation to pending queue for offline sync
     */
    addPendingOperation(endpoint, options) {
        this.pendingOperations.push({
            endpoint,
            options,
            timestamp: Date.now()
        });
        
        // Save to localStorage for persistence
        localStorage.setItem(
            this.localStorageKeys.PENDING_OPS, 
            JSON.stringify(this.pendingOperations)
        );
    }

    /**
     * Sync pending operations when back online
     */
    async syncPendingOperations() {
        try {
            // Load pending operations from localStorage
            const stored = localStorage.getItem(this.localStorageKeys.PENDING_OPS);
            if (stored) {
                this.pendingOperations = JSON.parse(stored);
            }

            if (this.pendingOperations.length === 0) return;

            console.log(`🔄 Syncing ${this.pendingOperations.length} pending operations...`);

            for (const operation of this.pendingOperations) {
                try {
                    await this.makeApiRequest(operation.endpoint, operation.options);
                } catch (error) {
                    console.error('❌ Failed to sync operation:', error);
                }
            }

            // Clear pending operations
            this.pendingOperations = [];
            localStorage.removeItem(this.localStorageKeys.PENDING_OPS);
            
            console.log('✅ Pending operations synced');
            
        } catch (error) {
            console.error('❌ Failed to sync pending operations:', error);
        }
    }

    /**
     * Save a task
     */
    async saveTask(task) {
        try {
            if (this.isOnline) {
                const result = await this.makeApiRequest('/tasks', {
                    method: task.id ? 'PUT' : 'POST',
                    body: JSON.stringify(task)
                });
                return result;
            } else {
                // Save to localStorage when offline
                return this.saveTaskToLocalStorage(task);
            }
        } catch (error) {
            console.error('❌ Failed to save task:', error);
            // Fallback to localStorage
            return this.saveTaskToLocalStorage(task);
        }
    }

    /**
     * Get all tasks
     */
    async getAllTasks() {
        try {
            if (this.isOnline) {
                const result = await this.makeApiRequest('/tasks');
                return result.tasks || [];
            } else {
                return this.getTasksFromLocalStorage();
            }
        } catch (error) {
            console.error('❌ Failed to get tasks:', error);
            return this.getTasksFromLocalStorage();
        }
    }

    /**
     * Get task by ID
     */
    async getTask(id) {
        try {
            if (this.isOnline) {
                const result = await this.makeApiRequest(`/tasks/${id}`);
                return result.task;
            } else {
                const tasks = this.getTasksFromLocalStorage();
                return tasks.find(task => task.id === id);
            }
        } catch (error) {
            console.error('❌ Failed to get task:', error);
            const tasks = this.getTasksFromLocalStorage();
            return tasks.find(task => task.id === id);
        }
    }

    /**
     * Delete a task
     */
    async deleteTask(id) {
        try {
            if (this.isOnline) {
                await this.makeApiRequest(`/tasks/${id}`, { method: 'DELETE' });
            } else {
                this.deleteTaskFromLocalStorage(id);
            }
        } catch (error) {
            console.error('❌ Failed to delete task:', error);
            this.deleteTaskFromLocalStorage(id);
        }
    }

    /**
     * Get tasks by date range
     */
    async getTasksByDateRange(startDate, endDate) {
        try {
            if (this.isOnline) {
                const result = await this.makeApiRequest(
                    `/tasks/date-range?start=${startDate}&end=${endDate}`
                );
                return result.tasks || [];
            } else {
                const tasks = this.getTasksFromLocalStorage();
                return tasks.filter(task => {
                    if (!task.dueDate) return false;
                    return task.dueDate >= startDate && task.dueDate <= endDate;
                });
            }
        } catch (error) {
            console.error('❌ Failed to get tasks by date range:', error);
            const tasks = this.getTasksFromLocalStorage();
            return tasks.filter(task => {
                if (!task.dueDate) return false;
                return task.dueDate >= startDate && task.dueDate <= endDate;
            });
        }
    }

    /**
     * Get tasks by category
     */
    async getTasksByCategory(category) {
        try {
            if (this.isOnline) {
                const result = await this.makeApiRequest(`/tasks/category/${category}`);
                return result.tasks || [];
            } else {
                const tasks = this.getTasksFromLocalStorage();
                return tasks.filter(task => task.category === category);
            }
        } catch (error) {
            console.error('❌ Failed to get tasks by category:', error);
            const tasks = this.getTasksFromLocalStorage();
            return tasks.filter(task => task.category === category);
        }
    }

    /**
     * Set a setting
     */
    async setSetting(key, value) {
        try {
            if (this.isOnline) {
                await this.makeApiRequest('/settings', {
                    method: 'POST',
                    body: JSON.stringify({ key, value })
                });
            } else {
                this.setSettingInLocalStorage(key, value);
            }
        } catch (error) {
            console.error('❌ Failed to set setting:', error);
            this.setSettingInLocalStorage(key, value);
        }
    }

    /**
     * Get a setting
     */
    async getSetting(key, defaultValue = null) {
        try {
            if (this.isOnline) {
                const result = await this.makeApiRequest(`/settings/${key}`);
                return result.value !== undefined ? result.value : defaultValue;
            } else {
                return this.getSettingFromLocalStorage(key, defaultValue);
            }
        } catch (error) {
            console.error('❌ Failed to get setting:', error);
            return this.getSettingFromLocalStorage(key, defaultValue);
        }
    }

    /**
     * Save statistic
     */
    async saveStatistic(date, type, data) {
        try {
            if (this.isOnline) {
                await this.makeApiRequest('/statistics', {
                    method: 'POST',
                    body: JSON.stringify({ date, type, data })
                });
            } else {
                this.saveStatisticToLocalStorage(date, type, data);
            }
        } catch (error) {
            console.error('❌ Failed to save statistic:', error);
            this.saveStatisticToLocalStorage(date, type, data);
        }
    }

    /**
     * Get statistics
     */
    async getStatistics() {
        try {
            if (this.isOnline) {
                const result = await this.makeApiRequest('/statistics');
                return result.statistics || [];
            } else {
                return this.getStatisticsFromLocalStorage();
            }
        } catch (error) {
            console.error('❌ Failed to get statistics:', error);
            return this.getStatisticsFromLocalStorage();
        }
    }

    /**
     * Export all data
     */
    async exportData() {
        try {
            if (this.isOnline) {
                const result = await this.makeApiRequest('/export');
                return result;
            } else {
                return this.exportDataFromLocalStorage();
            }
        } catch (error) {
            console.error('❌ Failed to export data:', error);
            return this.exportDataFromLocalStorage();
        }
    }

    /**
     * Import data
     */
    async importData(data) {
        try {
            if (this.isOnline) {
                await this.makeApiRequest('/import', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
            } else {
                this.importDataToLocalStorage(data);
            }
        } catch (error) {
            console.error('❌ Failed to import data:', error);
            this.importDataToLocalStorage(data);
        }
    }

    /**
     * Clear all data
     */
    async clearAll() {
        try {
            if (this.isOnline) {
                await this.makeApiRequest('/clear', { method: 'POST' });
            }
            // Always clear localStorage as well
            this.clearLocalStorageData();
        } catch (error) {
            console.error('❌ Failed to clear data:', error);
            this.clearLocalStorageData();
        }
    }

    /**
     * Save all pending changes (no-op for database storage)
     */
    async saveAll() {
        // Database operations are immediately persisted
        await this.syncPendingOperations();
    }

    /**
     * Get storage information
     */
    async getStorageInfo() {
        try {
            if (this.isOnline) {
                const result = await this.makeApiRequest('/storage-info');
                return result;
            } else {
                const tasks = this.getTasksFromLocalStorage();
                return {
                    type: 'localStorage (offline)',
                    taskCount: tasks.length,
                    available: true
                };
            }
        } catch (error) {
            const tasks = this.getTasksFromLocalStorage();
            return {
                type: 'localStorage (fallback)',
                taskCount: tasks.length,
                available: true
            };
        }
    }

    // LocalStorage fallback methods
    saveTaskToLocalStorage(task) {
        const tasks = this.getTasksFromLocalStorage();
        
        if (task.id) {
            const index = tasks.findIndex(t => t.id === task.id);
            if (index >= 0) {
                tasks[index] = { ...task, updatedAt: new Date().toISOString() };
            } else {
                tasks.push({ ...task, updatedAt: new Date().toISOString() });
            }
        } else {
            const newTask = {
                ...task,
                id: 'temp_' + Date.now(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            tasks.push(newTask);
            task = newTask;
        }
        
        localStorage.setItem(this.localStorageKeys.TASKS, JSON.stringify(tasks));
        return task;
    }

    getTasksFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.localStorageKeys.TASKS);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('❌ Failed to parse tasks from localStorage:', error);
            return [];
        }
    }

    deleteTaskFromLocalStorage(id) {
        const tasks = this.getTasksFromLocalStorage();
        const filtered = tasks.filter(task => task.id !== id);
        localStorage.setItem(this.localStorageKeys.TASKS, JSON.stringify(filtered));
    }

    setSettingInLocalStorage(key, value) {
        const settings = this.getSettingsFromLocalStorage();
        settings[key] = value;
        localStorage.setItem(this.localStorageKeys.SETTINGS, JSON.stringify(settings));
    }

    getSettingFromLocalStorage(key, defaultValue = null) {
        const settings = this.getSettingsFromLocalStorage();
        return settings[key] !== undefined ? settings[key] : defaultValue;
    }

    getSettingsFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.localStorageKeys.SETTINGS);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('❌ Failed to parse settings from localStorage:', error);
            return {};
        }
    }

    saveStatisticToLocalStorage(date, type, data) {
        const stats = this.getStatisticsFromLocalStorage();
        stats.push({ date, type, data, createdAt: new Date().toISOString() });
        localStorage.setItem(this.localStorageKeys.STATISTICS, JSON.stringify(stats));
    }

    getStatisticsFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.localStorageKeys.STATISTICS);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('❌ Failed to parse statistics from localStorage:', error);
            return [];
        }
    }

    exportDataFromLocalStorage() {
        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            tasks: this.getTasksFromLocalStorage(),
            settings: this.getSettingsFromLocalStorage(),
            statistics: this.getStatisticsFromLocalStorage()
        };
    }

    importDataToLocalStorage(data) {
        if (data.tasks) {
            localStorage.setItem(this.localStorageKeys.TASKS, JSON.stringify(data.tasks));
        }
        if (data.settings) {
            localStorage.setItem(this.localStorageKeys.SETTINGS, JSON.stringify(data.settings));
        }
        if (data.statistics) {
            localStorage.setItem(this.localStorageKeys.STATISTICS, JSON.stringify(data.statistics));
        }
    }

    clearLocalStorageData() {
        Object.values(this.localStorageKeys).forEach(key => {
            localStorage.removeItem(key);
        });
    }

    // ===== EXPENSE MANAGEMENT METHODS =====

    /**
     * Save an expense
     */
    async saveExpense(expense) {
        try {
            if (this.isOnline) {
                const endpoint = expense.id ? `/expenses/${expense.id}` : '/expenses';
                const method = expense.id ? 'PUT' : 'POST';
                
                const result = await this.makeApiRequest(endpoint, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(expense)
                });
                
                return result.expense;
            } else {
                // Store offline and add to pending operations
                const savedExpense = this.saveExpenseToLocalStorage(expense);
                this.addPendingOperation(`/expenses${expense.id ? `/${expense.id}` : ''}`, {
                    method: expense.id ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(expense)
                });
                return savedExpense;
            }
        } catch (error) {
            console.error('❌ Failed to save expense online, storing locally:', error);
            return this.saveExpenseToLocalStorage(expense);
        }
    }

    /**
     * Get all expenses
     */
    async getAllExpenses() {
        try {
            if (this.isOnline) {
                const result = await this.makeApiRequest('/expenses');
                
                // Also sync with localStorage for offline access
                if (result.expenses) {
                    localStorage.setItem(this.localStorageKeys.EXPENSES, JSON.stringify(result.expenses));
                }
                
                return result.expenses || [];
            } else {
                return this.getExpensesFromLocalStorage();
            }
        } catch (error) {
            console.error('❌ Failed to get expenses from database, using localStorage:', error);
            return this.getExpensesFromLocalStorage();
        }
    }

    /**
     * Get expense by ID
     */
    async getExpense(id) {
        try {
            if (this.isOnline) {
                const result = await this.makeApiRequest(`/expenses/${id}`);
                return result.expense;
            } else {
                const expenses = this.getExpensesFromLocalStorage();
                return expenses.find(expense => expense.id === id);
            }
        } catch (error) {
            console.error('❌ Failed to get expense from database, using localStorage:', error);
            const expenses = this.getExpensesFromLocalStorage();
            return expenses.find(expense => expense.id === id);
        }
    }

    /**
     * Delete an expense
     */
    async deleteExpense(id) {
        try {
            if (this.isOnline) {
                await this.makeApiRequest(`/expenses/${id}`, { method: 'DELETE' });
            } else {
                this.addPendingOperation(`/expenses/${id}`, { method: 'DELETE' });
            }
            
            // Always remove from localStorage
            this.deleteExpenseFromLocalStorage(id);
        } catch (error) {
            console.error('❌ Failed to delete expense online, removing locally:', error);
            this.deleteExpenseFromLocalStorage(id);
        }
    }

    /**
     * Get expenses by date range
     */
    async getExpensesByDateRange(startDate, endDate) {
        try {
            if (this.isOnline) {
                const result = await this.makeApiRequest(`/expenses/date-range/${startDate}/${endDate}`);
                return result.expenses || [];
            } else {
                const expenses = this.getExpensesFromLocalStorage();
                return expenses.filter(expense => {
                    const expenseDate = new Date(expense.date);
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    return expenseDate >= start && expenseDate <= end;
                });
            }
        } catch (error) {
            console.error('❌ Failed to get expenses by date range from database:', error);
            const expenses = this.getExpensesFromLocalStorage();
            return expenses.filter(expense => {
                const expenseDate = new Date(expense.date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                return expenseDate >= start && expenseDate <= end;
            });
        }
    }

    /**
     * Get expenses by category
     */
    async getExpensesByCategory(category) {
        try {
            if (this.isOnline) {
                const result = await this.makeApiRequest(`/expenses/category/${category}`);
                return result.expenses || [];
            } else {
                const expenses = this.getExpensesFromLocalStorage();
                return expenses.filter(expense => expense.category === category);
            }
        } catch (error) {
            console.error('❌ Failed to get expenses by category from database:', error);
            const expenses = this.getExpensesFromLocalStorage();
            return expenses.filter(expense => expense.category === category);
        }
    }

    // ===== LOCAL STORAGE EXPENSE METHODS =====

    saveExpenseToLocalStorage(expense) {
        const expenses = this.getExpensesFromLocalStorage();
        
        if (expense.id) {
            const index = expenses.findIndex(e => e.id === expense.id);
            if (index >= 0) {
                expenses[index] = { ...expense, updatedAt: new Date().toISOString() };
            } else {
                expenses.push({ ...expense, updatedAt: new Date().toISOString() });
            }
        } else {
            const newExpense = {
                ...expense,
                id: 'temp_' + Date.now(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            expenses.push(newExpense);
            expense = newExpense;
        }
        
        localStorage.setItem(this.localStorageKeys.EXPENSES, JSON.stringify(expenses));
        return expense;
    }

    getExpensesFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.localStorageKeys.EXPENSES);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('❌ Failed to parse expenses from localStorage:', error);
            return [];
        }
    }

    deleteExpenseFromLocalStorage(id) {
        const expenses = this.getExpensesFromLocalStorage();
        const filtered = expenses.filter(expense => expense.id !== id);
        localStorage.setItem(this.localStorageKeys.EXPENSES, JSON.stringify(filtered));
    }
}