/**
 * Storage Manager - Handles data persistence using localStorage and IndexedDB
 * Provides a unified interface for storing tasks, settings, and user preferences
 */

class StorageManager {
    constructor() {
        this.dbName = 'PlannerProDB';
        this.dbVersion = 1;
        this.db = null;
        this.isIndexedDBAvailable = false;
        this.storageKeys = {
            TASKS: 'plannerpro_tasks',
            SETTINGS: 'plannerpro_settings',
            THEMES: 'plannerpro_themes',
            STATISTICS: 'plannerpro_statistics',
            FILTERS: 'plannerpro_filters',
            LAST_BACKUP: 'plannerpro_last_backup'
        };
    }

    /**
     * Initialize storage system
     */
    async init() {
        try {
            // Check IndexedDB availability
            this.isIndexedDBAvailable = await this.checkIndexedDBSupport();
            
            if (this.isIndexedDBAvailable) {
                await this.initIndexedDB();
                console.log('✅ IndexedDB initialized successfully');
            } else {
                console.log('⚠️ IndexedDB not available, falling back to localStorage');
            }
            
            // Migrate data from localStorage to IndexedDB if needed
            if (this.isIndexedDBAvailable) {
                await this.migrateFromLocalStorage();
            }
            
            // Setup automatic backup
            this.setupAutoBackup();
            
            console.log('✅ StorageManager initialized');
            
        } catch (error) {
            console.error('❌ StorageManager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Check if IndexedDB is supported
     */
    async checkIndexedDBSupport() {
        try {
            return new Promise((resolve) => {
                if (!window.indexedDB) {
                    resolve(false);
                    return;
                }
                
                // Test if IndexedDB actually works
                const testRequest = indexedDB.open('test-db', 1);
                
                testRequest.onerror = () => resolve(false);
                testRequest.onsuccess = () => {
                    testRequest.result.close();
                    indexedDB.deleteDatabase('test-db');
                    resolve(true);
                };
                testRequest.onupgradeneeded = (e) => {
                    e.target.result.close();
                    resolve(true);
                };
                
                // Timeout fallback
                setTimeout(() => resolve(false), 1000);
            });
        } catch (error) {
            return false;
        }
    }

    /**
     * Initialize IndexedDB
     */
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                
                // Handle database errors
                this.db.onerror = (event) => {
                    console.error('IndexedDB error:', event.target.error);
                };
                
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    taskStore.createIndex('date', 'dueDate', { unique: false });
                    taskStore.createIndex('category', 'category', { unique: false });
                    taskStore.createIndex('priority', 'priority', { unique: false });
                    taskStore.createIndex('status', 'status', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                if (!db.objectStoreNames.contains('statistics')) {
                    const statsStore = db.createObjectStore('statistics', { keyPath: 'date' });
                    statsStore.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    /**
     * Migrate data from localStorage to IndexedDB
     */
    async migrateFromLocalStorage() {
        try {
            for (const [key, storageKey] of Object.entries(this.storageKeys)) {
                const data = localStorage.getItem(storageKey);
                if (data) {
                    const parsedData = JSON.parse(data);
                    
                    if (key === 'TASKS' && Array.isArray(parsedData)) {
                        // Migrate tasks
                        for (const task of parsedData) {
                            await this.saveTask(task);
                        }
                    } else {
                        // Migrate other settings
                        await this.setSetting(key.toLowerCase(), parsedData);
                    }
                    
                    console.log(`✅ Migrated ${key} from localStorage to IndexedDB`);
                }
            }
        } catch (error) {
            console.error('❌ Migration failed:', error);
        }
    }

    /**
     * Setup automatic backup
     */
    setupAutoBackup() {
        // Backup every hour
        setInterval(() => {
            this.createAutoBackup();
        }, 60 * 60 * 1000);
    }

    /**
     * Create automatic backup
     */
    async createAutoBackup() {
        try {
            const backupData = await this.exportData();
            const backupKey = `${this.storageKeys.LAST_BACKUP}_${Date.now()}`;
            
            // Keep only last 5 backups
            const existingBackups = Object.keys(localStorage).filter(key => 
                key.startsWith(this.storageKeys.LAST_BACKUP)
            ).sort();
            
            if (existingBackups.length >= 5) {
                for (let i = 0; i < existingBackups.length - 4; i++) {
                    localStorage.removeItem(existingBackups[i]);
                }
            }
            
            localStorage.setItem(backupKey, JSON.stringify(backupData));
            console.log('✅ Auto backup created');
            
        } catch (error) {
            console.error('❌ Auto backup failed:', error);
        }
    }

    /**
     * Save a task
     */
    async saveTask(task) {
        try {
            if (this.isIndexedDBAvailable && this.db) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['tasks'], 'readwrite');
                    const store = transaction.objectStore('tasks');
                    const request = store.put(task);
                    
                    request.onsuccess = () => resolve(task);
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Fallback to localStorage
                const tasks = await this.getAllTasks();
                const existingIndex = tasks.findIndex(t => t.id === task.id);
                
                if (existingIndex >= 0) {
                    tasks[existingIndex] = task;
                } else {
                    tasks.push(task);
                }
                
                localStorage.setItem(this.storageKeys.TASKS, JSON.stringify(tasks));
                return task;
            }
        } catch (error) {
            console.error('❌ Failed to save task:', error);
            throw error;
        }
    }

    /**
     * Get all tasks
     */
    async getAllTasks() {
        try {
            if (this.isIndexedDBAvailable && this.db) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['tasks'], 'readonly');
                    const store = transaction.objectStore('tasks');
                    const request = store.getAll();
                    
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Fallback to localStorage
                const tasks = localStorage.getItem(this.storageKeys.TASKS);
                return tasks ? JSON.parse(tasks) : [];
            }
        } catch (error) {
            console.error('❌ Failed to get tasks:', error);
            return [];
        }
    }

    /**
     * Get task by ID
     */
    async getTask(id) {
        try {
            if (this.isIndexedDBAvailable && this.db) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['tasks'], 'readonly');
                    const store = transaction.objectStore('tasks');
                    const request = store.get(id);
                    
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Fallback to localStorage
                const tasks = await this.getAllTasks();
                return tasks.find(task => task.id === id);
            }
        } catch (error) {
            console.error('❌ Failed to get task:', error);
            return null;
        }
    }

    /**
     * Delete a task
     */
    async deleteTask(id) {
        try {
            if (this.isIndexedDBAvailable && this.db) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['tasks'], 'readwrite');
                    const store = transaction.objectStore('tasks');
                    const request = store.delete(id);
                    
                    request.onsuccess = () => resolve(true);
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Fallback to localStorage
                const tasks = await this.getAllTasks();
                const filteredTasks = tasks.filter(task => task.id !== id);
                localStorage.setItem(this.storageKeys.TASKS, JSON.stringify(filteredTasks));
                return true;
            }
        } catch (error) {
            console.error('❌ Failed to delete task:', error);
            throw error;
        }
    }

    /**
     * Get tasks by date range
     */
    async getTasksByDateRange(startDate, endDate) {
        try {
            const allTasks = await this.getAllTasks();
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            return allTasks.filter(task => {
                if (!task.dueDate) return false;
                const taskDate = new Date(task.dueDate);
                return taskDate >= start && taskDate <= end;
            });
        } catch (error) {
            console.error('❌ Failed to get tasks by date range:', error);
            return [];
        }
    }

    /**
     * Get tasks by category
     */
    async getTasksByCategory(category) {
        try {
            if (this.isIndexedDBAvailable && this.db) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['tasks'], 'readonly');
                    const store = transaction.objectStore('tasks');
                    const index = store.index('category');
                    const request = index.getAll(category);
                    
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Fallback to localStorage
                const allTasks = await this.getAllTasks();
                return allTasks.filter(task => task.category === category);
            }
        } catch (error) {
            console.error('❌ Failed to get tasks by category:', error);
            return [];
        }
    }

    /**
     * Save setting
     */
    async setSetting(key, value) {
        try {
            if (this.isIndexedDBAvailable && this.db) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['settings'], 'readwrite');
                    const store = transaction.objectStore('settings');
                    const request = store.put({ key, value, updatedAt: new Date().toISOString() });
                    
                    request.onsuccess = () => resolve(value);
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Fallback to localStorage
                localStorage.setItem(`${this.storageKeys.SETTINGS}_${key}`, JSON.stringify(value));
                return value;
            }
        } catch (error) {
            console.error('❌ Failed to save setting:', error);
            throw error;
        }
    }

    /**
     * Get setting
     */
    async getSetting(key, defaultValue = null) {
        try {
            if (this.isIndexedDBAvailable && this.db) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['settings'], 'readonly');
                    const store = transaction.objectStore('settings');
                    const request = store.get(key);
                    
                    request.onsuccess = () => {
                        const result = request.result;
                        resolve(result ? result.value : defaultValue);
                    };
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Fallback to localStorage
                const setting = localStorage.getItem(`${this.storageKeys.SETTINGS}_${key}`);
                return setting ? JSON.parse(setting) : defaultValue;
            }
        } catch (error) {
            console.error('❌ Failed to get setting:', error);
            return defaultValue;
        }
    }

    /**
     * Save statistics
     */
    async saveStatistic(date, type, data) {
        try {
            const stat = {
                date: date,
                type: type,
                data: data,
                timestamp: new Date().toISOString()
            };

            if (this.isIndexedDBAvailable && this.db) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['statistics'], 'readwrite');
                    const store = transaction.objectStore('statistics');
                    const request = store.put(stat);
                    
                    request.onsuccess = () => resolve(stat);
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Fallback to localStorage
                const stats = await this.getStatistics();
                const existingIndex = stats.findIndex(s => s.date === date && s.type === type);
                
                if (existingIndex >= 0) {
                    stats[existingIndex] = stat;
                } else {
                    stats.push(stat);
                }
                
                localStorage.setItem(this.storageKeys.STATISTICS, JSON.stringify(stats));
                return stat;
            }
        } catch (error) {
            console.error('❌ Failed to save statistic:', error);
            throw error;
        }
    }

    /**
     * Get statistics
     */
    async getStatistics() {
        try {
            if (this.isIndexedDBAvailable && this.db) {
                return new Promise((resolve, reject) => {
                    const transaction = this.db.transaction(['statistics'], 'readonly');
                    const store = transaction.objectStore('statistics');
                    const request = store.getAll();
                    
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = () => reject(request.error);
                });
            } else {
                // Fallback to localStorage
                const stats = localStorage.getItem(this.storageKeys.STATISTICS);
                return stats ? JSON.parse(stats) : [];
            }
        } catch (error) {
            console.error('❌ Failed to get statistics:', error);
            return [];
        }
    }

    /**
     * Export all data
     */
    async exportData() {
        try {
            const data = {
                tasks: await this.getAllTasks(),
                settings: {},
                statistics: await this.getStatistics(),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            // Get all settings
            const settingKeys = ['theme', 'notifications', 'calendar', 'filters'];
            for (const key of settingKeys) {
                data.settings[key] = await this.getSetting(key);
            }

            return data;
        } catch (error) {
            console.error('❌ Failed to export data:', error);
            throw error;
        }
    }

    /**
     * Import data
     */
    async importData(data) {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data format');
            }

            // Import tasks
            if (data.tasks && Array.isArray(data.tasks)) {
                for (const task of data.tasks) {
                    await this.saveTask(task);
                }
            }

            // Import settings
            if (data.settings && typeof data.settings === 'object') {
                for (const [key, value] of Object.entries(data.settings)) {
                    if (value !== undefined) {
                        await this.setSetting(key, value);
                    }
                }
            }

            // Import statistics
            if (data.statistics && Array.isArray(data.statistics)) {
                for (const stat of data.statistics) {
                    await this.saveStatistic(stat.date, stat.type, stat.data);
                }
            }

            console.log('✅ Data imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to import data:', error);
            throw error;
        }
    }

    /**
     * Clear all data
     */
    async clearAll() {
        try {
            if (this.isIndexedDBAvailable && this.db) {
                // Clear IndexedDB
                const transaction = this.db.transaction(['tasks', 'settings', 'statistics'], 'readwrite');
                
                await Promise.all([
                    new Promise((resolve, reject) => {
                        const request = transaction.objectStore('tasks').clear();
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    }),
                    new Promise((resolve, reject) => {
                        const request = transaction.objectStore('settings').clear();
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    }),
                    new Promise((resolve, reject) => {
                        const request = transaction.objectStore('statistics').clear();
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    })
                ]);
            }

            // Clear localStorage
            Object.values(this.storageKeys).forEach(key => {
                localStorage.removeItem(key);
                // Also remove setting-specific keys
                Object.keys(localStorage).forEach(storageKey => {
                    if (storageKey.startsWith(key)) {
                        localStorage.removeItem(storageKey);
                    }
                });
            });

            console.log('✅ All data cleared');
            return true;
        } catch (error) {
            console.error('❌ Failed to clear data:', error);
            throw error;
        }
    }

    /**
     * Save all pending changes
     */
    async saveAll() {
        try {
            // This method can be called before page unload
            // Currently handled by individual save operations
            console.log('✅ All data saved');
            return true;
        } catch (error) {
            console.error('❌ Failed to save all data:', error);
            return false;
        }
    }

    /**
     * Get storage usage information
     */
    async getStorageInfo() {
        try {
            const info = {
                type: this.isIndexedDBAvailable ? 'IndexedDB' : 'localStorage',
                tasksCount: (await this.getAllTasks()).length,
                statisticsCount: (await this.getStatistics()).length,
                lastBackup: null,
                estimatedSize: 0
            };

            // Calculate estimated size
            const data = await this.exportData();
            info.estimatedSize = new Blob([JSON.stringify(data)]).size;

            return info;
        } catch (error) {
            console.error('❌ Failed to get storage info:', error);
            return null;
        }
    }
}

// Make StorageManager globally available
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}
