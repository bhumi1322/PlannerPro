/**
 * Task Manager - Handles all task-related operations including CRUD, status management, and UI updates
 * Provides comprehensive task management with priority, categories, and due dates
 */

class TaskManager {
    constructor() {
        this.tasks = [];
        this.categories = ['work', 'personal', 'health', 'education', 'shopping'];
        this.priorities = ['low', 'medium', 'high'];
        this.storage = null;
        this.currentEditingTask = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.openTaskModal = this.openTaskModal.bind(this);
        this.saveTask = this.saveTask.bind(this);
        this.deleteTask = this.deleteTask.bind(this);
        this.completeTask = this.completeTask.bind(this);
    }

    /**
     * Initialize task manager
     */
    async init() {
        try {
            // Get storage instance
            this.storage = window.plannerApp?.getComponent('storage') || new StorageManager();
            
            // Load tasks from storage
            await this.loadTasks();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Refresh UI
            this.refreshTaskList();
            this.updateQuickStats();
            
            console.log('✅ TaskManager initialized');
            
        } catch (error) {
            console.error('❌ TaskManager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        try {
            // Task form submission
            const taskForm = document.getElementById('task-form');
            if (taskForm) {
                taskForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveTask();
                });
            }

            // Modal close buttons
            const closeModalBtn = document.getElementById('close-modal');
            const cancelTaskBtn = document.getElementById('cancel-task');
            const modalOverlay = document.getElementById('task-modal-overlay');

            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', this.closeTaskModal);
            }

            if (cancelTaskBtn) {
                cancelTaskBtn.addEventListener('click', this.closeTaskModal);
            }

            if (modalOverlay) {
                modalOverlay.addEventListener('click', (e) => {
                    if (e.target === modalOverlay) {
                        this.closeTaskModal();
                    }
                });
            }

            // Quick add task shortcut
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.target.matches('input, textarea')) {
                    e.preventDefault();
                    this.openTaskModal();
                }
            });

            console.log('✅ Task event listeners setup');

        } catch (error) {
            console.error('❌ Failed to setup task event listeners:', error);
        }
    }

    /**
     * Load tasks from storage
     */
    async loadTasks() {
        try {
            this.tasks = await this.storage.getAllTasks();
            
            // Ensure all tasks have required properties
            this.tasks = this.tasks.map(task => this.normalizeTask(task));
            
            console.log(`✅ Loaded ${this.tasks.length} tasks`);
            
        } catch (error) {
            console.error('❌ Failed to load tasks:', error);
            this.tasks = [];
        }
    }

    /**
     * Normalize task object to ensure all required properties exist
     */
    normalizeTask(task) {
        return {
            id: task.id || this.generateTaskId(),
            title: task.title || '',
            description: task.description || '',
            dueDate: task.dueDate || null,
            dueTime: task.dueTime || null,
            priority: task.priority || 'medium',
            category: task.category || 'personal',
            status: task.status || 'pending',
            tags: task.tags || [],
            createdAt: task.createdAt || new Date().toISOString(),
            updatedAt: task.updatedAt || new Date().toISOString(),
            completedAt: task.completedAt || null,
            reminder: task.reminder || false,
            timeSpent: task.timeSpent || 0,
            notifiedReminder: task.notifiedReminder || false,
            notifiedOverdue: task.notifiedOverdue || false
        };
    }

    /**
     * Generate unique task ID
     */
    generateTaskId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Open task modal for creating or editing
     */
    openTaskModal(taskId = null) {
        try {
            const modal = document.getElementById('task-modal-overlay');
            const modalTitle = document.getElementById('modal-title');
            const form = document.getElementById('task-form');
            
            if (!modal || !modalTitle || !form) {
                console.error('❌ Task modal elements not found');
                return;
            }

            // Reset form
            form.reset();
            this.currentEditingTask = null;

            if (taskId) {
                // Editing existing task
                const task = this.getTaskById(taskId);
                if (task) {
                    this.currentEditingTask = task;
                    modalTitle.textContent = 'Edit Task';
                    this.populateTaskForm(task);
                }
            } else {
                // Creating new task
                modalTitle.textContent = 'Add New Task';
                this.setDefaultFormValues();
            }

            // Show modal
            modal.classList.add('active');
            
            // Focus on title input
            const titleInput = document.getElementById('task-title');
            if (titleInput) {
                setTimeout(() => titleInput.focus(), 100);
            }

            // Animate modal appearance
            if (typeof gsap !== 'undefined') {
                const modalContent = modal.querySelector('.modal');
                gsap.fromTo(modalContent,
                    { scale: 0.8, opacity: 0 },
                    { scale: 1, opacity: 1, duration: 0.3, ease: "power2.out" }
                );
            }

        } catch (error) {
            console.error('❌ Failed to open task modal:', error);
        }
    }

    /**
     * Close task modal
     */
    closeTaskModal() {
        try {
            const modal = document.getElementById('task-modal-overlay');
            if (modal) {
                // Animate modal disappearance
                if (typeof gsap !== 'undefined') {
                    const modalContent = modal.querySelector('.modal');
                    gsap.to(modalContent, {
                        scale: 0.8,
                        opacity: 0,
                        duration: 0.2,
                        ease: "power2.in",
                        onComplete: () => {
                            modal.classList.remove('active');
                        }
                    });
                } else {
                    modal.classList.remove('active');
                }
            }
            
            this.currentEditingTask = null;
        } catch (error) {
            console.error('❌ Failed to close task modal:', error);
        }
    }

    /**
     * Populate task form with existing task data
     */
    populateTaskForm(task) {
        try {
            document.getElementById('task-title').value = task.title || '';
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-date').value = task.dueDate || '';
            document.getElementById('task-time').value = task.dueTime || '';
            document.getElementById('task-priority').value = task.priority || 'medium';
            document.getElementById('task-category').value = task.category || 'personal';
            document.getElementById('task-tags').value = (task.tags || []).join(', ');
            document.getElementById('task-reminder').checked = task.reminder || false;
        } catch (error) {
            console.error('❌ Failed to populate task form:', error);
        }
    }

    /**
     * Set default form values for new task
     */
    setDefaultFormValues() {
        try {
            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            
            document.getElementById('task-date').value = todayString;
            document.getElementById('task-priority').value = 'medium';
            document.getElementById('task-category').value = 'personal';
        } catch (error) {
            console.error('❌ Failed to set default form values:', error);
        }
    }

    /**
     * Save task (create or update)
     */
    async saveTask() {
        try {
            const formData = this.getFormData();
            
            // Validate form data
            if (!this.validateTaskForm(formData)) {
                return;
            }

            let task;
            
            if (this.currentEditingTask) {
                // Update existing task
                task = {
                    ...this.currentEditingTask,
                    ...formData,
                    updatedAt: new Date().toISOString()
                };
            } else {
                // Create new task
                task = {
                    ...formData,
                    id: this.generateTaskId(),
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    completedAt: null,
                    timeSpent: 0,
                    notifiedReminder: false,
                    notifiedOverdue: false
                };
            }

            // Save to storage
            await this.storage.saveTask(task);
            
            // Update local tasks array
            if (this.currentEditingTask) {
                const index = this.tasks.findIndex(t => t.id === task.id);
                if (index >= 0) {
                    this.tasks[index] = task;
                }
            } else {
                this.tasks.push(task);
            }

            // Close modal
            this.closeTaskModal();
            
            // Refresh UI
            this.refreshTaskList();
            this.updateQuickStats();
            
            // Trigger refresh for other components
            this.triggerTaskUpdate();
            
            // Show success notification
            const action = this.currentEditingTask ? 'updated' : 'created';
            NotificationManager.show('Task Saved', `Task "${task.title}" ${action} successfully`, 'success');
            
            console.log(`✅ Task ${action}: ${task.title}`);

        } catch (error) {
            console.error('❌ Failed to save task:', error);
            NotificationManager.show('Save Failed', 'Failed to save task. Please try again.', 'error');
        }
    }

    /**
     * Get form data
     */
    getFormData() {
        try {
            const title = document.getElementById('task-title').value.trim();
            const description = document.getElementById('task-description').value.trim();
            const dueDate = document.getElementById('task-date').value;
            const dueTime = document.getElementById('task-time').value;
            const priority = document.getElementById('task-priority').value;
            const category = document.getElementById('task-category').value;
            const tagsString = document.getElementById('task-tags').value.trim();
            const reminder = document.getElementById('task-reminder').checked;

            // Parse tags
            const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

            return {
                title,
                description,
                dueDate: dueDate || null,
                dueTime: dueTime || null,
                priority,
                category,
                tags,
                reminder
            };
        } catch (error) {
            console.error('❌ Failed to get form data:', error);
            return {};
        }
    }

    /**
     * Validate task form
     */
    validateTaskForm(formData) {
        try {
            if (!formData.title) {
                NotificationManager.show('Validation Error', 'Task title is required', 'error');
                return false;
            }

            if (formData.title.length > 200) {
                NotificationManager.show('Validation Error', 'Task title is too long (max 200 characters)', 'error');
                return false;
            }

            if (formData.description && formData.description.length > 1000) {
                NotificationManager.show('Validation Error', 'Task description is too long (max 1000 characters)', 'error');
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ Form validation failed:', error);
            return false;
        }
    }

    /**
     * Delete task
     */
    async deleteTask(taskId) {
        try {
            const task = this.getTaskById(taskId);
            if (!task) {
                console.error('❌ Task not found for deletion:', taskId);
                return;
            }

            // Confirm deletion
            const confirmed = confirm(`Are you sure you want to delete "${task.title}"?`);
            if (!confirmed) return;

            // Delete from storage
            await this.storage.deleteTask(taskId);
            
            // Remove from local array
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            
            // Refresh UI
            this.refreshTaskList();
            this.updateQuickStats();
            
            // Trigger refresh for other components
            this.triggerTaskUpdate();
            
            // Show success notification
            NotificationManager.show('Task Deleted', `Task "${task.title}" deleted successfully`, 'info');
            
            console.log(`✅ Task deleted: ${task.title}`);

        } catch (error) {
            console.error('❌ Failed to delete task:', error);
            NotificationManager.show('Delete Failed', 'Failed to delete task. Please try again.', 'error');
        }
    }

    /**
     * Complete/uncomplete task
     */
    async completeTask(taskId) {
        try {
            const task = this.getTaskById(taskId);
            if (!task) {
                console.error('❌ Task not found for completion:', taskId);
                return;
            }

            // Get task element for animation
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);

            // Toggle completion status
            const wasCompleted = task.status === 'completed';
            task.status = wasCompleted ? 'pending' : 'completed';
            task.completedAt = wasCompleted ? null : new Date().toISOString();
            task.updatedAt = new Date().toISOString();

            // Add celebratory animation for completion
            if (!wasCompleted && taskElement) {
                taskElement.classList.add('just-completed');
                taskElement.classList.add('animate-bounce');
                
                // Remove animation classes after animation completes
                setTimeout(() => {
                    taskElement.classList.remove('animate-bounce');
                }, 600);
                
                setTimeout(() => {
                    taskElement.classList.remove('just-completed');
                }, 1000);
            }

            // Save to storage
            await this.storage.saveTask(task);
            
            // Update local array
            const index = this.tasks.findIndex(t => t.id === taskId);
            if (index >= 0) {
                this.tasks[index] = task;
            }
            
            // Refresh UI with animation delay for completion
            if (!wasCompleted) {
                setTimeout(() => {
                    this.refreshTaskList();
                    this.updateQuickStats();
                }, 500);
            } else {
                this.refreshTaskList();
                this.updateQuickStats();
            }
            
            // Trigger refresh for other components
            this.triggerTaskUpdate();
            
            // Show notification
            const action = wasCompleted ? 'reopened' : 'completed';
            const notificationType = wasCompleted ? 'info' : 'success';
            NotificationManager.show('Task Updated', `Task "${task.title}" ${action}`, notificationType);
            
            console.log(`✅ Task ${action}: ${task.title}`);

        } catch (error) {
            console.error('❌ Failed to complete task:', error);
            NotificationManager.show('Update Failed', 'Failed to update task. Please try again.', 'error');
        }
    }

    /**
     * Edit task
     */
    editTask(taskId) {
        this.openTaskModal(taskId);
    }

    /**
     * Get task by ID
     */
    getTaskById(taskId) {
        return this.tasks.find(task => task.id === taskId);
    }

    /**
     * Get tasks by status
     */
    getTasksByStatus(status) {
        return this.tasks.filter(task => task.status === status);
    }

    /**
     * Get tasks by category
     */
    getTasksByCategory(category) {
        return this.tasks.filter(task => task.category === category);
    }

    /**
     * Get tasks by priority
     */
    getTasksByPriority(priority) {
        return this.tasks.filter(task => task.priority === priority);
    }

    /**
     * Get tasks by date
     */
    getTasksByDate(date) {
        return this.tasks.filter(task => task.dueDate === date);
    }

    /**
     * Get overdue tasks
     */
    getOverdueTasks() {
        const today = new Date().toISOString().split('T')[0];
        return this.tasks.filter(task => 
            task.status !== 'completed' && 
            task.dueDate && 
            task.dueDate < today
        );
    }

    /**
     * Refresh task list display
     */
    refreshTaskList() {
        try {
            const taskList = document.getElementById('task-list');
            const emptyState = document.getElementById('empty-tasks');
            
            if (!taskList) return;

            // Get filtered tasks (from FilterManager if available)
            const filterManager = window.plannerApp?.getComponent('filters');
            const filteredTasks = filterManager ? filterManager.getFilteredTasks() : this.tasks;

            if (filteredTasks.length === 0) {
                taskList.innerHTML = '';
                if (emptyState) {
                    emptyState.style.display = 'block';
                }
                return;
            }

            if (emptyState) {
                emptyState.style.display = 'none';
            }

            // Sort tasks
            const sortedTasks = this.sortTasks(filteredTasks);

            // Generate HTML
            taskList.innerHTML = sortedTasks.map(task => this.createTaskHTML(task)).join('');

            // Setup task item event listeners
            this.setupTaskItemListeners();

            // Animate task items
            this.animateTaskItems();

        } catch (error) {
            console.error('❌ Failed to refresh task list:', error);
        }
    }

    /**
     * Sort tasks by priority and due date
     */
    sortTasks(tasks) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        
        return [...tasks].sort((a, b) => {
            // Completed tasks go to bottom
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (b.status === 'completed' && a.status !== 'completed') return -1;
            
            // Sort by priority
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            
            // Sort by due date
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && b.dueDate) return 1;
            
            // Sort by creation date
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }

    /**
     * Create HTML for task item
     */
    createTaskHTML(task) {
        try {
            const isOverdue = this.isTaskOverdue(task);
            const formattedDate = this.formatTaskDate(task);
            const tagsHTML = task.tags.map(tag => `<span class="task-tag">${this.escapeHtml(tag)}</span>`).join('');

            return `
                <div class="task-item ${task.status}" data-task-id="${task.id}" draggable="true">
                    <div class="task-priority-indicator ${task.priority}"></div>
                    
                    <div class="task-header">
                        <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                        <div class="task-actions">
                            <button class="btn-icon" onclick="taskManager.editTask('${task.id}')" title="Edit Task">
                                <i data-feather="edit-2"></i>
                            </button>
                            <button class="btn-icon" onclick="taskManager.deleteTask('${task.id}')" title="Delete Task">
                                <i data-feather="trash-2"></i>
                            </button>
                        </div>
                    </div>
                    
                    ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                    
                    <div class="task-meta">
                        <div class="task-info">
                            ${formattedDate ? `
                                <div class="task-date ${isOverdue ? 'overdue' : ''}">
                                    <i data-feather="calendar"></i>
                                    <span>${formattedDate}</span>
                                </div>
                            ` : ''}
                            
                            <div class="task-category">
                                <i data-feather="folder"></i>
                                <span>${this.escapeHtml(task.category)}</span>
                            </div>
                            
                            ${task.tags.length > 0 ? `
                                <div class="task-tags">
                                    ${tagsHTML}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="task-completion">
                            <div class="task-checkbox ${task.status === 'completed' ? 'completed' : ''}" 
                                 onclick="taskManager.completeTask('${task.id}')">
                                ${task.status === 'completed' ? '<i data-feather="check"></i>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ Failed to create task HTML:', error);
            return '';
        }
    }

    /**
     * Check if task is overdue
     */
    isTaskOverdue(task) {
        if (!task.dueDate || task.status === 'completed') return false;
        
        const today = new Date().toISOString().split('T')[0];
        return task.dueDate < today;
    }

    /**
     * Format task date for display
     */
    formatTaskDate(task) {
        try {
            if (!task.dueDate) return '';
            
            const date = new Date(task.dueDate);
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const dateString = date.toISOString().split('T')[0];
            const todayString = today.toISOString().split('T')[0];
            const tomorrowString = tomorrow.toISOString().split('T')[0];
            
            let formattedDate;
            if (dateString === todayString) {
                formattedDate = 'Today';
            } else if (dateString === tomorrowString) {
                formattedDate = 'Tomorrow';
            } else {
                formattedDate = date.toLocaleDateString();
            }
            
            if (task.dueTime) {
                const time = new Date(`2000-01-01T${task.dueTime}`);
                formattedDate += ` at ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
            
            return formattedDate;
        } catch (error) {
            console.error('❌ Failed to format task date:', error);
            return task.dueDate || '';
        }
    }

    /**
     * Setup task item event listeners
     */
    setupTaskItemListeners() {
        try {
            const taskItems = document.querySelectorAll('.task-item');
            
            taskItems.forEach(item => {
                // Add hover effects
                item.addEventListener('mouseenter', (e) => {
                    if (typeof gsap !== 'undefined') {
                        gsap.to(e.target, { scale: 1.02, duration: 0.2 });
                    }
                });
                
                item.addEventListener('mouseleave', (e) => {
                    if (typeof gsap !== 'undefined') {
                        gsap.to(e.target, { scale: 1, duration: 0.2 });
                    }
                });
            });

            // Re-initialize feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }

        } catch (error) {
            console.error('❌ Failed to setup task item listeners:', error);
        }
    }

    /**
     * Animate task items
     */
    animateTaskItems() {
        try {
            if (typeof gsap !== 'undefined') {
                const taskItems = document.querySelectorAll('.task-item');
                gsap.fromTo(taskItems,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.3, stagger: 0.1, ease: "power2.out" }
                );
            }
        } catch (error) {
            console.error('❌ Failed to animate task items:', error);
        }
    }

    /**
     * Update quick stats
     */
    updateQuickStats() {
        try {
            const totalTasks = this.tasks.length;
            const completedTasks = this.getTasksByStatus('completed').length;
            const pendingTasks = this.getTasksByStatus('pending').length;
            const overdueTasks = this.getOverdueTasks().length;

            // Update UI elements
            this.updateStatElement('total-tasks', totalTasks);
            this.updateStatElement('completed-tasks', completedTasks);
            this.updateStatElement('pending-tasks', pendingTasks);
            this.updateStatElement('overdue-tasks', overdueTasks);

        } catch (error) {
            console.error('❌ Failed to update quick stats:', error);
        }
    }

    /**
     * Update stat element
     */
    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Trigger task update event for other components
     */
    triggerTaskUpdate() {
        try {
            const event = new CustomEvent('tasksUpdated', {
                detail: {
                    tasks: this.tasks,
                    timestamp: new Date().toISOString()
                }
            });
            
            document.dispatchEvent(event);
        } catch (error) {
            console.error('❌ Failed to trigger task update event:', error);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get all tasks
     */
    getAllTasks() {
        return [...this.tasks];
    }

    /**
     * Get task statistics
     */
    getTaskStatistics() {
        try {
            const total = this.tasks.length;
            const completed = this.getTasksByStatus('completed').length;
            const pending = this.getTasksByStatus('pending').length;
            const overdue = this.getOverdueTasks().length;

            const byCategory = this.categories.reduce((acc, category) => {
                acc[category] = this.getTasksByCategory(category).length;
                return acc;
            }, {});

            const byPriority = this.priorities.reduce((acc, priority) => {
                acc[priority] = this.getTasksByPriority(priority).length;
                return acc;
            }, {});

            return {
                total,
                completed,
                pending,
                overdue,
                completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
                byCategory,
                byPriority
            };
        } catch (error) {
            console.error('❌ Failed to get task statistics:', error);
            return null;
        }
    }

    /**
     * Export tasks
     */
    exportTasks() {
        try {
            return {
                tasks: this.tasks,
                categories: this.categories,
                priorities: this.priorities,
                exportDate: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Failed to export tasks:', error);
            return null;
        }
    }

    /**
     * Import tasks
     */
    async importTasks(data) {
        try {
            if (data.tasks && Array.isArray(data.tasks)) {
                for (const task of data.tasks) {
                    const normalizedTask = this.normalizeTask(task);
                    await this.storage.saveTask(normalizedTask);
                }
                
                await this.loadTasks();
                this.refreshTaskList();
                this.updateQuickStats();
                
                console.log(`✅ Imported ${data.tasks.length} tasks`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Failed to import tasks:', error);
            return false;
        }
    }
}

// Make TaskManager globally available
if (typeof window !== 'undefined') {
    window.TaskManager = TaskManager;
    
    // Create global instance for easy access from HTML
    window.taskManager = null;
    
    // Initialize when app is ready
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.taskManager) {
            window.taskManager = new TaskManager();
        }
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskManager;
}
