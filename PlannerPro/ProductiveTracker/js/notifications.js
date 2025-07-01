/**
 * Notification Manager - Handles toast notifications, due task alerts, and user notifications
 * Provides a comprehensive notification system with different types and auto-dismiss
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.settings = {
            enabled: true,
            duration: 5000,
            maxNotifications: 5,
            reminderTime: 15, // minutes before due date
            soundEnabled: false
        };
        this.storage = null;
        this.checkInterval = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.show = this.show.bind(this);
        this.checkOverdueTasks = this.checkOverdueTasks.bind(this);
    }

    /**
     * Initialize notification manager
     */
    async init() {
        try {
            // Get storage instance
            this.storage = window.plannerApp?.getComponent('storage') || new StorageManager();
            
            // Load settings
            await this.loadSettings();
            
            // Create notification container
            this.createContainer();
            
            // Setup permission for browser notifications
            await this.requestPermission();
            
            // Start checking for due tasks
            this.startTaskChecking();
            
            console.log('✅ NotificationManager initialized');
            
        } catch (error) {
            console.error('❌ NotificationManager initialization failed:', error);
        }
    }

    /**
     * Load notification settings
     */
    async loadSettings() {
        try {
            if (this.storage) {
                const savedSettings = await this.storage.getSetting('notifications', {});
                this.settings = { ...this.settings, ...savedSettings };
            }
        } catch (error) {
            console.error('❌ Failed to load notification settings:', error);
        }
    }

    /**
     * Save notification settings
     */
    async saveSettings() {
        try {
            if (this.storage) {
                await this.storage.setSetting('notifications', this.settings);
            }
        } catch (error) {
            console.error('❌ Failed to save notification settings:', error);
        }
    }

    /**
     * Create notification container
     */
    createContainer() {
        try {
            this.container = document.getElementById('notification-container');
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'notification-container';
                this.container.className = 'notification-container';
                document.body.appendChild(this.container);
            }
        } catch (error) {
            console.error('❌ Failed to create notification container:', error);
        }
    }

    /**
     * Request notification permission
     */
    async requestPermission() {
        try {
            if ('Notification' in window && Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                console.log(`Notification permission: ${permission}`);
            }
        } catch (error) {
            console.error('❌ Failed to request notification permission:', error);
        }
    }

    /**
     * Show a notification
     */
    show(title, message, type = 'info', options = {}) {
        try {
            if (!this.settings.enabled) return;

            const notification = {
                id: Date.now() + Math.random(),
                title,
                message,
                type,
                timestamp: new Date(),
                duration: options.duration || this.settings.duration,
                persistent: options.persistent || false,
                actions: options.actions || []
            };

            // Add to notifications array
            this.notifications.push(notification);

            // Create notification element
            const element = this.createNotificationElement(notification);

            // Add to container
            if (this.container) {
                this.container.appendChild(element);
            }

            // Show with animation
            this.showNotificationElement(element);

            // Auto-dismiss if not persistent
            if (!notification.persistent && notification.duration > 0) {
                setTimeout(() => {
                    this.dismiss(notification.id);
                }, notification.duration);
            }

            // Limit number of notifications
            this.limitNotifications();

            // Show browser notification if enabled and permission granted
            if (options.browserNotification && 'Notification' in window && Notification.permission === 'granted') {
                this.showBrowserNotification(title, message, type);
            }

            console.log(`✅ Notification shown: ${title}`);
            return notification.id;

        } catch (error) {
            console.error('❌ Failed to show notification:', error);
            return null;
        }
    }

    /**
     * Create notification DOM element
     */
    createNotificationElement(notification) {
        try {
            const element = document.createElement('div');
            element.className = `notification ${notification.type}`;
            element.dataset.id = notification.id;

            // Get icon based on type
            const iconName = this.getIconForType(notification.type);

            element.innerHTML = `
                <div class="notification-icon">
                    <i data-feather="${iconName}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${this.escapeHtml(notification.title)}</div>
                    <div class="notification-message">${this.escapeHtml(notification.message)}</div>
                    ${notification.actions.length > 0 ? this.createActionButtons(notification.actions) : ''}
                </div>
                <button class="notification-close btn-icon" title="Close">
                    <i data-feather="x"></i>
                </button>
            `;

            // Setup close button
            const closeBtn = element.querySelector('.notification-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.dismiss(notification.id);
                });
            }

            // Setup action buttons
            const actionButtons = element.querySelectorAll('.notification-action');
            actionButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const action = notification.actions.find(a => a.id === e.target.dataset.actionId);
                    if (action && action.handler) {
                        action.handler();
                        this.dismiss(notification.id);
                    }
                });
            });

            // Initialize feather icons
            if (typeof feather !== 'undefined') {
                feather.replace(element);
            }

            return element;

        } catch (error) {
            console.error('❌ Failed to create notification element:', error);
            return null;
        }
    }

    /**
     * Create action buttons HTML
     */
    createActionButtons(actions) {
        try {
            const buttonsHtml = actions.map(action => `
                <button class="notification-action btn-secondary" data-action-id="${action.id}">
                    ${this.escapeHtml(action.label)}
                </button>
            `).join('');

            return `<div class="notification-actions">${buttonsHtml}</div>`;
        } catch (error) {
            console.error('❌ Failed to create action buttons:', error);
            return '';
        }
    }

    /**
     * Show notification element with animation
     */
    showNotificationElement(element) {
        try {
            if (!element) return;

            // Use GSAP if available, otherwise use CSS
            if (typeof gsap !== 'undefined') {
                gsap.fromTo(element, 
                    { x: 100, opacity: 0 },
                    { x: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
                );
            } else {
                element.classList.add('show');
            }

        } catch (error) {
            console.error('❌ Failed to show notification element:', error);
        }
    }

    /**
     * Dismiss a notification
     */
    dismiss(notificationId) {
        try {
            const element = this.container?.querySelector(`[data-id="${notificationId}"]`);
            if (!element) return;

            // Animate out
            if (typeof gsap !== 'undefined') {
                gsap.to(element, {
                    x: 100,
                    opacity: 0,
                    duration: 0.3,
                    ease: "power2.in",
                    onComplete: () => {
                        element.remove();
                    }
                });
            } else {
                element.classList.remove('show');
                setTimeout(() => {
                    element.remove();
                }, 300);
            }

            // Remove from notifications array
            this.notifications = this.notifications.filter(n => n.id !== notificationId);

        } catch (error) {
            console.error('❌ Failed to dismiss notification:', error);
        }
    }

    /**
     * Dismiss all notifications
     */
    dismissAll() {
        try {
            this.notifications.forEach(notification => {
                this.dismiss(notification.id);
            });
        } catch (error) {
            console.error('❌ Failed to dismiss all notifications:', error);
        }
    }

    /**
     * Limit number of notifications
     */
    limitNotifications() {
        try {
            if (this.notifications.length > this.settings.maxNotifications) {
                const excess = this.notifications.length - this.settings.maxNotifications;
                for (let i = 0; i < excess; i++) {
                    const oldestNotification = this.notifications[0];
                    this.dismiss(oldestNotification.id);
                }
            }
        } catch (error) {
            console.error('❌ Failed to limit notifications:', error);
        }
    }

    /**
     * Show browser notification
     */
    showBrowserNotification(title, message, type) {
        try {
            if ('Notification' in window && Notification.permission === 'granted') {
                const notification = new Notification(title, {
                    body: message,
                    icon: this.getIconUrlForType(type),
                    badge: '/favicon.ico',
                    tag: `plannerpro-${type}`,
                    renotify: true
                });

                // Auto-close after 5 seconds
                setTimeout(() => {
                    notification.close();
                }, 5000);

                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };
            }
        } catch (error) {
            console.error('❌ Failed to show browser notification:', error);
        }
    }

    /**
     * Start checking for due tasks
     */
    startTaskChecking() {
        try {
            // Check every minute
            this.checkInterval = setInterval(() => {
                this.checkOverdueTasks();
            }, 60 * 1000);

            // Initial check
            this.checkOverdueTasks();

            console.log('✅ Task checking started');
        } catch (error) {
            console.error('❌ Failed to start task checking:', error);
        }
    }

    /**
     * Stop checking for due tasks
     */
    stopTaskChecking() {
        try {
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
        } catch (error) {
            console.error('❌ Failed to stop task checking:', error);
        }
    }

    /**
     * Check for overdue and upcoming tasks
     */
    async checkOverdueTasks() {
        try {
            if (!this.settings.enabled || !this.storage) return;

            const tasks = await this.storage.getAllTasks();
            const now = new Date();
            const reminderTime = this.settings.reminderTime * 60 * 1000; // Convert to milliseconds

            for (const task of tasks) {
                if (task.status === 'completed' || !task.dueDate) continue;

                const dueDate = new Date(task.dueDate + (task.dueTime ? `T${task.dueTime}` : ''));
                const timeDiff = dueDate.getTime() - now.getTime();

                // Check if task is overdue
                if (timeDiff < 0 && !task.notifiedOverdue) {
                    this.show(
                        'Task Overdue!',
                        `"${task.title}" was due ${this.formatRelativeTime(dueDate)}`,
                        'error',
                        {
                            persistent: true,
                            browserNotification: true,
                            actions: [
                                {
                                    id: 'complete',
                                    label: 'Mark Complete',
                                    handler: () => this.completeTask(task.id)
                                },
                                {
                                    id: 'view',
                                    label: 'View Task',
                                    handler: () => this.viewTask(task.id)
                                }
                            ]
                        }
                    );

                    // Mark as notified
                    task.notifiedOverdue = true;
                    await this.storage.saveTask(task);
                }
                // Check if task is due soon
                else if (timeDiff > 0 && timeDiff <= reminderTime && !task.notifiedReminder) {
                    this.show(
                        'Task Due Soon',
                        `"${task.title}" is due ${this.formatRelativeTime(dueDate)}`,
                        'warning',
                        {
                            browserNotification: true,
                            actions: [
                                {
                                    id: 'complete',
                                    label: 'Mark Complete',
                                    handler: () => this.completeTask(task.id)
                                },
                                {
                                    id: 'snooze',
                                    label: 'Snooze 1h',
                                    handler: () => this.snoozeTask(task.id, 60)
                                }
                            ]
                        }
                    );

                    // Mark as notified
                    task.notifiedReminder = true;
                    await this.storage.saveTask(task);
                }
            }

        } catch (error) {
            console.error('❌ Failed to check overdue tasks:', error);
        }
    }

    /**
     * Complete a task from notification
     */
    async completeTask(taskId) {
        try {
            const taskManager = window.plannerApp?.getComponent('tasks');
            if (taskManager) {
                await taskManager.completeTask(taskId);
                this.show('Task Completed', 'Task marked as complete!', 'success');
            }
        } catch (error) {
            console.error('❌ Failed to complete task from notification:', error);
        }
    }

    /**
     * View a task from notification
     */
    viewTask(taskId) {
        try {
            const taskManager = window.plannerApp?.getComponent('tasks');
            if (taskManager) {
                taskManager.editTask(taskId);
                
                // Switch to tasks view
                if (window.plannerApp) {
                    window.plannerApp.switchView('tasks');
                }
            }
        } catch (error) {
            console.error('❌ Failed to view task from notification:', error);
        }
    }

    /**
     * Snooze a task
     */
    async snoozeTask(taskId, minutes) {
        try {
            const task = await this.storage.getTask(taskId);
            if (task) {
                const newDueDate = new Date(Date.now() + minutes * 60 * 1000);
                task.dueDate = newDueDate.toISOString().split('T')[0];
                task.dueTime = newDueDate.toTimeString().slice(0, 5);
                task.notifiedReminder = false;
                task.notifiedOverdue = false;
                
                await this.storage.saveTask(task);
                this.show('Task Snoozed', `Task rescheduled for ${minutes} minutes from now`, 'info');
            }
        } catch (error) {
            console.error('❌ Failed to snooze task:', error);
        }
    }

    /**
     * Get icon for notification type
     */
    getIconForType(type) {
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info',
            task: 'calendar'
        };
        return icons[type] || 'info';
    }

    /**
     * Get icon URL for notification type (for browser notifications)
     */
    getIconUrlForType(type) {
        // Return data URI or icon path based on type
        const iconSizes = '32x32';
        const icons = {
            success: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' fill='%2310B981' viewBox='0 0 24 24'><path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'></path><polyline points='22,4 12,14.01 9,11.01'></polyline></svg>`,
            error: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' fill='%23EF4444' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10'></circle><line x1='15' y1='9' x2='9' y2='15'></line><line x1='9' y1='9' x2='15' y2='15'></line></svg>`,
            warning: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' fill='%23F59E0B' viewBox='0 0 24 24'><path d='m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z'></path><line x1='12' y1='9' x2='12' y2='13'></line><line x1='12' y1='17' x2='12.01' y2='17'></line></svg>`,
            info: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' fill='%233B82F6' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10'></circle><line x1='12' y1='16' x2='12' y2='12'></line><line x1='12' y1='8' x2='12.01' y2='8'></line></svg>`
        };
        return icons[type] || icons.info;
    }

    /**
     * Format relative time
     */
    formatRelativeTime(date) {
        try {
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const absDiff = Math.abs(diff);
            
            const minute = 60 * 1000;
            const hour = 60 * minute;
            const day = 24 * hour;
            
            if (absDiff < minute) {
                return diff < 0 ? 'in a few seconds' : 'a few seconds ago';
            } else if (absDiff < hour) {
                const minutes = Math.floor(absDiff / minute);
                return diff < 0 ? `in ${minutes} minute${minutes !== 1 ? 's' : ''}` : `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
            } else if (absDiff < day) {
                const hours = Math.floor(absDiff / hour);
                return diff < 0 ? `in ${hours} hour${hours !== 1 ? 's' : ''}` : `${hours} hour${hours !== 1 ? 's' : ''} ago`;
            } else {
                const days = Math.floor(absDiff / day);
                return diff < 0 ? `in ${days} day${days !== 1 ? 's' : ''}` : `${days} day${days !== 1 ? 's' : ''} ago`;
            }
        } catch (error) {
            console.error('❌ Failed to format relative time:', error);
            return 'some time';
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
     * Update notification settings
     */
    async updateSettings(newSettings) {
        try {
            this.settings = { ...this.settings, ...newSettings };
            await this.saveSettings();
            
            console.log('✅ Notification settings updated');
        } catch (error) {
            console.error('❌ Failed to update notification settings:', error);
        }
    }

    /**
     * Get notification statistics
     */
    getStatistics() {
        try {
            return {
                total: this.notifications.length,
                byType: this.notifications.reduce((acc, notification) => {
                    acc[notification.type] = (acc[notification.type] || 0) + 1;
                    return acc;
                }, {}),
                settings: this.settings
            };
        } catch (error) {
            console.error('❌ Failed to get notification statistics:', error);
            return null;
        }
    }

    /**
     * Test notification system
     */
    test() {
        try {
            this.show('Test Notification', 'This is a test notification to verify the system is working correctly.', 'info');
            console.log('✅ Test notification sent');
        } catch (error) {
            console.error('❌ Failed to send test notification:', error);
        }
    }
}

// Notification Manager static methods for easy access
NotificationManager.show = function(title, message, type = 'info', options = {}) {
    const manager = window.plannerApp?.getComponent('notifications') || new NotificationManager();
    return manager.show(title, message, type, options);
};

NotificationManager.success = function(title, message, options = {}) {
    return NotificationManager.show(title, message, 'success', options);
};

NotificationManager.error = function(title, message, options = {}) {
    return NotificationManager.show(title, message, 'error', options);
};

NotificationManager.warning = function(title, message, options = {}) {
    return NotificationManager.show(title, message, 'warning', options);
};

NotificationManager.info = function(title, message, options = {}) {
    return NotificationManager.show(title, message, 'info', options);
};

// Make NotificationManager globally available
if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
