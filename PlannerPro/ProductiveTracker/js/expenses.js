/**
 * Expense Manager - Handles expense tracking, categorization, and analytics
 * Provides comprehensive expense management with database integration
 */

class ExpenseManager {
    constructor() {
        this.expenses = [];
        this.categories = [
            { id: 'food', name: 'Food & Dining', icon: '🍔', color: '#FF6B6B' },
            { id: 'transport', name: 'Transportation', icon: '🚗', color: '#4ECDC4' },
            { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#45B7D1' },
            { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#FFA07A' },
            { id: 'utilities', name: 'Utilities', icon: '⚡', color: '#98D8C8' },
            { id: 'health', name: 'Health & Medical', icon: '🏥', color: '#F7DC6F' },
            { id: 'education', name: 'Education', icon: '📚', color: '#BB8FCE' },
            { id: 'travel', name: 'Travel', icon: '✈️', color: '#85C1E9' },
            { id: 'home', name: 'Home & Garden', icon: '🏠', color: '#82E0AA' },
            { id: 'other', name: 'Other', icon: '📦', color: '#D2B4DE' }
        ];
        this.currentFilters = {
            search: '',
            category: '',
            timeRange: 'all'
        };
        this.isEditing = false;
        this.editingExpenseId = null;
        this.chart = null;
        this.initialized = false;
    }

    /**
     * Initialize expense manager
     */
    async init() {
        if (this.initialized) return;
        
        try {
            console.log('🔄 Initializing ExpenseManager...');
            
            await this.loadExpenses();
            this.setupEventListeners();
            this.setupExpenseUpdateListener();
            this.updateDisplay();
            this.initializeChart();
            
            this.initialized = true;
            console.log('✅ ExpenseManager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize ExpenseManager:', error);
            throw error;
        }
    }

    /**
     * Load expenses from storage
     */
    async loadExpenses() {
        try {
            if (window.storageManager) {
                this.expenses = await window.storageManager.getAllExpenses() || [];
            } else {
                this.expenses = this.getExpensesFromLocalStorage();
            }
            console.log(`✅ Loaded ${this.expenses.length} expenses`);
        } catch (error) {
            console.error('❌ Failed to load expenses:', error);
            this.expenses = [];
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add expense button
        const addExpenseBtn = document.getElementById('add-expense-btn');
        if (addExpenseBtn) {
            addExpenseBtn.addEventListener('click', () => this.openExpenseModal());
        }

        // Modal controls
        const closeModal = document.getElementById('close-expense-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeExpenseModal());
        }

        const cancelBtn = document.getElementById('cancel-expense');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeExpenseModal());
        }

        const modalOverlay = document.getElementById('expense-modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeExpenseModal();
                }
            });
        }

        // Form submission
        const expenseForm = document.getElementById('expense-form');
        if (expenseForm) {
            expenseForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Filter controls
        const searchInput = document.getElementById('expense-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
        }

        const categoryFilter = document.getElementById('expense-category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => this.setFilter('category', e.target.value));
        }

        const timeFilter = document.getElementById('expense-time-filter');
        if (timeFilter) {
            timeFilter.addEventListener('change', (e) => this.setFilter('timeRange', e.target.value));
        }

        // Recurring expense checkbox
        const recurringCheckbox = document.getElementById('expense-recurring');
        if (recurringCheckbox) {
            recurringCheckbox.addEventListener('change', (e) => {
                const recurringOptions = document.getElementById('recurring-options');
                if (recurringOptions) {
                    recurringOptions.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }

        // Set today's date as default
        const expenseDate = document.getElementById('expense-date');
        if (expenseDate) {
            expenseDate.value = new Date().toISOString().split('T')[0];
        }

        console.log('✅ Expense event listeners setup');
    }

    /**
     * Setup expense update listener
     */
    setupExpenseUpdateListener() {
        document.addEventListener('expenseUpdated', () => {
            this.loadExpenses().then(() => {
                this.updateDisplay();
                this.updateChart();
            });
        });
    }

    /**
     * Handle search input with debouncing
     */
    handleSearchInput(e) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.setFilter('search', e.target.value);
        }, 300);
    }

    /**
     * Set a filter value
     */
    async setFilter(filterType, value) {
        this.currentFilters[filterType] = value;
        this.updateDisplay();
    }

    /**
     * Open expense modal
     */
    openExpenseModal(expense = null) {
        const modal = document.getElementById('expense-modal-overlay');
        const title = document.getElementById('expense-modal-title');
        const form = document.getElementById('expense-form');
        
        if (!modal || !title || !form) return;

        this.isEditing = !!expense;
        this.editingExpenseId = expense ? expense.id : null;

        title.textContent = expense ? 'Edit Expense' : 'Add New Expense';
        
        if (expense) {
            this.populateExpenseForm(expense);
        } else {
            form.reset();
            // Set default date to today
            const expenseDate = document.getElementById('expense-date');
            if (expenseDate) {
                expenseDate.value = new Date().toISOString().split('T')[0];
            }
            // Set default currency
            const expenseCurrency = document.getElementById('expense-currency');
            if (expenseCurrency) {
                expenseCurrency.value = 'USD';
            }
        }

        modal.classList.add('active');
        
        // Focus on the first input
        setTimeout(() => {
            const firstInput = modal.querySelector('input[type="text"]');
            if (firstInput) firstInput.focus();
        }, 100);

        // Animate modal appearance
        gsap.fromTo(modal.querySelector('.modal'), 
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
        );
    }

    /**
     * Close expense modal
     */
    closeExpenseModal() {
        const modal = document.getElementById('expense-modal-overlay');
        if (!modal) return;

        // Animate modal disappearance
        gsap.to(modal.querySelector('.modal'), {
            scale: 0.8,
            opacity: 0,
            duration: 0.2,
            ease: "power2.in",
            onComplete: () => {
                modal.classList.remove('active');
                this.isEditing = false;
                this.editingExpenseId = null;
            }
        });
    }

    /**
     * Populate expense form with existing data
     */
    populateExpenseForm(expense) {
        const fields = {
            'expense-title': expense.description,
            'expense-amount': expense.amount,
            'expense-currency': expense.currency || 'USD',
            'expense-category': expense.category,
            'expense-payment': expense.paymentMethod || 'cash',
            'expense-date': expense.date,
            'expense-location': expense.location || '',
            'expense-notes': expense.notes || '',
            'expense-tags': expense.tags ? expense.tags.join(', ') : '',
            'expense-recurring': expense.isRecurring || false,
            'expense-recurring-type': expense.recurringType || 'monthly'
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });

        // Show/hide recurring options
        const recurringOptions = document.getElementById('recurring-options');
        if (recurringOptions && expense.isRecurring) {
            recurringOptions.style.display = 'block';
        }
    }

    /**
     * Handle form submission
     */
    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const expenseData = this.extractExpenseData();
            
            if (!this.validateExpenseData(expenseData)) {
                return;
            }

            if (this.isEditing) {
                await this.updateExpense(this.editingExpenseId, expenseData);
            } else {
                await this.createExpense(expenseData);
            }

            this.closeExpenseModal();
            this.triggerExpenseUpdate();
            
            // Show success notification
            if (window.notificationManager) {
                window.notificationManager.show(
                    `Expense ${this.isEditing ? 'updated' : 'added'} successfully!`,
                    'success'
                );
            }
            
        } catch (error) {
            console.error('❌ Failed to save expense:', error);
            if (window.notificationManager) {
                window.notificationManager.show('Failed to save expense', 'error');
            }
        }
    }

    /**
     * Extract expense data from form
     */
    extractExpenseData() {
        const tagsInput = document.getElementById('expense-tags').value;
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        return {
            description: document.getElementById('expense-title').value.trim(),
            amount: parseFloat(document.getElementById('expense-amount').value),
            currency: document.getElementById('expense-currency').value,
            category: document.getElementById('expense-category').value,
            paymentMethod: document.getElementById('expense-payment').value,
            date: document.getElementById('expense-date').value,
            location: document.getElementById('expense-location').value.trim(),
            notes: document.getElementById('expense-notes').value.trim(),
            tags: tags,
            isRecurring: document.getElementById('expense-recurring').checked,
            recurringType: document.getElementById('expense-recurring-type').value
        };
    }

    /**
     * Validate expense data
     */
    validateExpenseData(data) {
        if (!data.description) {
            this.showValidationError('Please enter a description');
            return false;
        }

        if (!data.amount || data.amount <= 0) {
            this.showValidationError('Please enter a valid amount');
            return false;
        }

        if (!data.category) {
            this.showValidationError('Please select a category');
            return false;
        }

        if (!data.date) {
            this.showValidationError('Please select a date');
            return false;
        }

        return true;
    }

    /**
     * Show validation error
     */
    showValidationError(message) {
        if (window.notificationManager) {
            window.notificationManager.show(message, 'error');
        } else {
            alert(message);
        }
    }

    /**
     * Create new expense
     */
    async createExpense(expenseData) {
        const expense = {
            id: this.generateId(),
            ...expenseData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (window.storageManager) {
            await window.storageManager.saveExpense(expense);
        } else {
            this.saveExpenseToLocalStorage(expense);
        }
    }

    /**
     * Update existing expense
     */
    async updateExpense(id, expenseData) {
        const updatedExpense = {
            ...expenseData,
            id: id,
            updatedAt: new Date().toISOString()
        };

        if (window.storageManager) {
            await window.storageManager.saveExpense(updatedExpense);
        } else {
            this.updateExpenseInLocalStorage(id, updatedExpense);
        }
    }

    /**
     * Delete expense
     */
    async deleteExpense(id) {
        if (!confirm('Are you sure you want to delete this expense?')) {
            return;
        }

        try {
            if (window.storageManager) {
                await window.storageManager.deleteExpense(id);
            } else {
                this.deleteExpenseFromLocalStorage(id);
            }

            this.triggerExpenseUpdate();
            
            if (window.notificationManager) {
                window.notificationManager.show('Expense deleted successfully!', 'success');
            }
        } catch (error) {
            console.error('❌ Failed to delete expense:', error);
            if (window.notificationManager) {
                window.notificationManager.show('Failed to delete expense', 'error');
            }
        }
    }

    /**
     * Update display
     */
    updateDisplay() {
        this.renderExpenseList();
        this.updateSummary();
        this.updateCategoryList();
        this.updateChart();
    }

    /**
     * Render expense list
     */
    renderExpenseList() {
        const container = document.getElementById('expense-list');
        const emptyState = document.getElementById('empty-expenses');
        
        if (!container) return;

        const filteredExpenses = this.getFilteredExpenses();
        
        if (filteredExpenses.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';

        // Sort expenses by date (newest first)
        filteredExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = filteredExpenses.map(expense => this.createExpenseElement(expense)).join('');

        // Add animation to expense items
        gsap.fromTo('.expense-item', 
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }
        );
    }

    /**
     * Create expense element HTML
     */
    createExpenseElement(expense) {
        const category = this.categories.find(cat => cat.id === expense.category);
        const categoryInfo = category || { icon: '📦', name: 'Other', color: '#D2B4DE' };
        
        const formattedAmount = this.formatCurrency(expense.amount, expense.currency);
        const formattedDate = this.formatDate(expense.date);
        
        return `
            <div class="expense-item" data-id="${expense.id}">
                <div class="expense-item-icon" style="background-color: ${categoryInfo.color}20; color: ${categoryInfo.color}">
                    ${categoryInfo.icon}
                </div>
                
                <div class="expense-item-content">
                    <div class="expense-item-header">
                        <h4 class="expense-title">${this.escapeHtml(expense.description)}</h4>
                        <span class="expense-amount">${formattedAmount}</span>
                    </div>
                    
                    <div class="expense-item-details">
                        <span class="expense-category" style="color: ${categoryInfo.color}">
                            ${categoryInfo.name}
                        </span>
                        <span class="expense-date">${formattedDate}</span>
                        ${expense.location ? `<span class="expense-location">📍 ${this.escapeHtml(expense.location)}</span>` : ''}
                    </div>
                    
                    ${expense.notes ? `<div class="expense-notes">${this.escapeHtml(expense.notes)}</div>` : ''}
                    
                    ${expense.tags && expense.tags.length > 0 ? `
                        <div class="expense-tags">
                            ${expense.tags.map(tag => `<span class="expense-tag">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="expense-item-actions">
                    <button class="btn-icon" onclick="expenseManager.openExpenseModal(expenseManager.getExpenseById('${expense.id}'))" title="Edit">
                        <i data-feather="edit-2"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="expenseManager.deleteExpense('${expense.id}')" title="Delete">
                        <i data-feather="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Update summary display
     */
    updateSummary() {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Calculate week start (assuming week starts on Sunday)
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        
        // Calculate month start
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const todaySpending = this.calculateSpending(expense => expense.date === todayStr);
        const weekSpending = this.calculateSpending(expense => new Date(expense.date) >= weekStart);
        const monthSpending = this.calculateSpending(expense => new Date(expense.date) >= monthStart);
        
        this.updateSummaryElement('today-spending', todaySpending);
        this.updateSummaryElement('week-spending', weekSpending);
        this.updateSummaryElement('month-spending', monthSpending);
    }

    /**
     * Update summary element
     */
    updateSummaryElement(elementId, amount) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = this.formatCurrency(amount);
        }
    }

    /**
     * Calculate spending based on filter function
     */
    calculateSpending(filterFn) {
        return this.expenses
            .filter(filterFn)
            .reduce((total, expense) => total + expense.amount, 0);
    }

    /**
     * Update category list
     */
    updateCategoryList() {
        const container = document.getElementById('expense-category-list');
        if (!container) return;

        const categorySpending = this.calculateCategorySpending();
        
        container.innerHTML = this.categories.map(category => {
            const spending = categorySpending[category.id] || 0;
            const formattedAmount = this.formatCurrency(spending);
            
            return `
                <div class="category-item" data-category="${category.id}">
                    <div class="category-info">
                        <span class="category-icon" style="color: ${category.color}">${category.icon}</span>
                        <span class="category-name">${category.name}</span>
                    </div>
                    <span class="category-amount">${formattedAmount}</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Calculate spending by category
     */
    calculateCategorySpending() {
        const spending = {};
        
        this.expenses.forEach(expense => {
            spending[expense.category] = (spending[expense.category] || 0) + expense.amount;
        });
        
        return spending;
    }

    /**
     * Initialize chart
     */
    initializeChart() {
        const canvas = document.getElementById('expense-chart');
        if (!canvas || !window.Chart) return;

        const ctx = canvas.getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        this.updateChart();
    }

    /**
     * Update chart
     */
    updateChart() {
        if (!this.chart) return;

        const categorySpending = this.calculateCategorySpending();
        const categories = this.categories.filter(cat => categorySpending[cat.id] > 0);
        
        if (categories.length === 0) {
            this.chart.data.labels = ['No expenses'];
            this.chart.data.datasets[0].data = [1];
            this.chart.data.datasets[0].backgroundColor = ['#e5e5e5'];
        } else {
            this.chart.data.labels = categories.map(cat => cat.name);
            this.chart.data.datasets[0].data = categories.map(cat => categorySpending[cat.id]);
            this.chart.data.datasets[0].backgroundColor = categories.map(cat => cat.color);
        }
        
        this.chart.update();
    }

    /**
     * Get filtered expenses
     */
    getFilteredExpenses() {
        return this.expenses.filter(expense => {
            // Search filter
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search.toLowerCase();
                const matchesSearch = 
                    expense.description.toLowerCase().includes(searchTerm) ||
                    expense.notes?.toLowerCase().includes(searchTerm) ||
                    expense.location?.toLowerCase().includes(searchTerm) ||
                    expense.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
                
                if (!matchesSearch) return false;
            }

            // Category filter
            if (this.currentFilters.category && expense.category !== this.currentFilters.category) {
                return false;
            }

            // Time range filter
            if (this.currentFilters.timeRange !== 'all') {
                const expenseDate = new Date(expense.date);
                const today = new Date();
                
                switch (this.currentFilters.timeRange) {
                    case 'today':
                        if (expenseDate.toDateString() !== today.toDateString()) return false;
                        break;
                    case 'week':
                        const weekAgo = new Date(today);
                        weekAgo.setDate(today.getDate() - 7);
                        if (expenseDate < weekAgo) return false;
                        break;
                    case 'month':
                        if (expenseDate.getMonth() !== today.getMonth() || 
                            expenseDate.getFullYear() !== today.getFullYear()) return false;
                        break;
                    case 'year':
                        if (expenseDate.getFullYear() !== today.getFullYear()) return false;
                        break;
                }
            }

            return true;
        });
    }

    /**
     * Get expense by ID
     */
    getExpenseById(id) {
        return this.expenses.find(expense => expense.id === id);
    }

    /**
     * Trigger expense update event
     */
    triggerExpenseUpdate() {
        document.dispatchEvent(new CustomEvent('expenseUpdated'));
    }

    /**
     * Format currency
     */
    formatCurrency(amount, currency = 'USD') {
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2
            }).format(amount);
        } catch (error) {
            return `$${amount.toFixed(2)}`;
        }
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Local storage fallback methods
    saveExpenseToLocalStorage(expense) {
        const expenses = this.getExpensesFromLocalStorage();
        const existingIndex = expenses.findIndex(e => e.id === expense.id);
        
        if (existingIndex >= 0) {
            expenses[existingIndex] = expense;
        } else {
            expenses.push(expense);
        }
        
        localStorage.setItem('planner_expenses', JSON.stringify(expenses));
        this.expenses = expenses;
    }

    updateExpenseInLocalStorage(id, updatedExpense) {
        const expenses = this.getExpensesFromLocalStorage();
        const index = expenses.findIndex(e => e.id === id);
        
        if (index >= 0) {
            expenses[index] = updatedExpense;
            localStorage.setItem('planner_expenses', JSON.stringify(expenses));
            this.expenses = expenses;
        }
    }

    deleteExpenseFromLocalStorage(id) {
        const expenses = this.getExpensesFromLocalStorage();
        const filteredExpenses = expenses.filter(e => e.id !== id);
        localStorage.setItem('planner_expenses', JSON.stringify(filteredExpenses));
        this.expenses = filteredExpenses;
    }

    getExpensesFromLocalStorage() {
        try {
            const stored = localStorage.getItem('planner_expenses');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to parse expenses from localStorage:', error);
            return [];
        }
    }

    /**
     * Export expenses data
     */
    exportExpenses() {
        return {
            expenses: this.expenses,
            categories: this.categories,
            exportDate: new Date().toISOString()
        };
    }

    /**
     * Import expenses data
     */
    async importExpenses(data) {
        if (data.expenses && Array.isArray(data.expenses)) {
            for (const expense of data.expenses) {
                if (window.storageManager) {
                    await window.storageManager.saveExpense(expense);
                } else {
                    this.saveExpenseToLocalStorage(expense);
                }
            }
            this.triggerExpenseUpdate();
        }
    }

    /**
     * Clear all expenses
     */
    async clearAllExpenses() {
        if (!confirm('Are you sure you want to delete all expenses? This action cannot be undone.')) {
            return;
        }

        try {
            if (window.storageManager) {
                // This would need to be implemented in the storage manager
                // await window.storageManager.clearAllExpenses();
            } else {
                localStorage.removeItem('planner_expenses');
                this.expenses = [];
            }
            
            this.triggerExpenseUpdate();
            
            if (window.notificationManager) {
                window.notificationManager.show('All expenses cleared successfully!', 'success');
            }
        } catch (error) {
            console.error('❌ Failed to clear expenses:', error);
            if (window.notificationManager) {
                window.notificationManager.show('Failed to clear expenses', 'error');
            }
        }
    }

    /**
     * Get expense statistics
     */
    getExpenseStatistics() {
        const total = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const categorySpending = this.calculateCategorySpending();
        const mostExpensiveCategory = Object.entries(categorySpending)
            .sort(([,a], [,b]) => b - a)[0];
        
        return {
            totalExpenses: this.expenses.length,
            totalAmount: total,
            averageExpense: this.expenses.length > 0 ? total / this.expenses.length : 0,
            categoriesUsed: Object.keys(categorySpending).length,
            mostExpensiveCategory: mostExpensiveCategory ? {
                category: mostExpensiveCategory[0],
                amount: mostExpensiveCategory[1]
            } : null
        };
    }

    /**
     * Refresh expenses
     */
    refresh() {
        this.loadExpenses().then(() => {
            this.updateDisplay();
        });
    }
}

// Initialize global expense manager
window.expenseManager = new ExpenseManager();