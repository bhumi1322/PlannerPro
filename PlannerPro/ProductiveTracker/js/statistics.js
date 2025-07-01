/**
 * Statistics Manager - Handles productivity analytics, charts, and performance metrics
 * Provides comprehensive insights into task completion, time tracking, and productivity trends
 */

class StatisticsManager {
    constructor() {
        this.charts = {};
        this.storage = null;
        this.tasks = [];
        this.currentPeriod = 'week';
        this.chartColors = {
            primary: '#4F46E5',
            success: '#10B981',
            warning: '#F59E0B',
            danger: '#EF4444',
            info: '#3B82F6',
            purple: '#7C3AED',
            pink: '#EC4899',
            gray: '#6B7280'
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.refresh = this.refresh.bind(this);
        this.updateCharts = this.updateCharts.bind(this);
        this.resizeCharts = this.resizeCharts.bind(this);
    }

    /**
     * Initialize statistics manager
     */
    async init() {
        try {
            // Get storage instance
            this.storage = window.plannerApp?.getComponent('storage') || new StorageManager();
            
            // Load tasks
            await this.loadTasks();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup task update listener
            this.setupTaskUpdateListener();
            
            // Initialize charts
            this.initializeCharts();
            
            console.log('✅ StatisticsManager initialized');
            
        } catch (error) {
            console.error('❌ StatisticsManager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Load tasks from storage
     */
    async loadTasks() {
        try {
            this.tasks = await this.storage.getAllTasks();
        } catch (error) {
            console.error('❌ Failed to load tasks for statistics:', error);
            this.tasks = [];
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        try {
            // Period selection buttons
            const periodBtns = document.querySelectorAll('.period-btn');
            periodBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const period = e.target.dataset.period;
                    this.setPeriod(period);
                });
            });

            // Window resize handler
            window.addEventListener('resize', () => {
                clearTimeout(this.resizeTimer);
                this.resizeTimer = setTimeout(this.resizeCharts, 250);
            });

            console.log('✅ Statistics event listeners setup');

        } catch (error) {
            console.error('❌ Failed to setup statistics event listeners:', error);
        }
    }

    /**
     * Setup task update listener
     */
    setupTaskUpdateListener() {
        try {
            document.addEventListener('tasksUpdated', (e) => {
                this.tasks = e.detail.tasks || [];
                this.updateCharts();
                this.updateTimeStats();
                this.updateAchievements();
            });
        } catch (error) {
            console.error('❌ Failed to setup task update listener:', error);
        }
    }

    /**
     * Initialize all charts
     */
    initializeCharts() {
        try {
            if (typeof Chart === 'undefined') {
                console.warn('⚠️ Chart.js not loaded, charts will not be available');
                return;
            }

            // Configure Chart.js defaults
            Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
            Chart.defaults.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim();

            // Initialize individual charts
            this.initCompletionChart();
            this.initDailyChart();
            this.initCategoryChart();
            this.initPriorityChart();

            console.log('✅ Charts initialized');

        } catch (error) {
            console.error('❌ Failed to initialize charts:', error);
        }
    }

    /**
     * Initialize completion chart (doughnut)
     */
    initCompletionChart() {
        try {
            const ctx = document.getElementById('completion-chart');
            if (!ctx) return;

            const stats = this.getCompletionStats();

            this.charts.completion = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Completed', 'Pending', 'Overdue'],
                    datasets: [{
                        data: [stats.completed, stats.pending, stats.overdue],
                        backgroundColor: [
                            this.chartColors.success,
                            this.chartColors.warning,
                            this.chartColors.danger
                        ],
                        borderWidth: 0,
                        cutout: '60%'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label;
                                    const value = context.parsed;
                                    const total = stats.completed + stats.pending + stats.overdue;
                                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('❌ Failed to initialize completion chart:', error);
        }
    }

    /**
     * Initialize daily progress chart (line)
     */
    initDailyChart() {
        try {
            const ctx = document.getElementById('daily-chart');
            if (!ctx) return;

            const dailyData = this.getDailyProgressData();

            this.charts.daily = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dailyData.labels,
                    datasets: [{
                        label: 'Tasks Completed',
                        data: dailyData.completed,
                        borderColor: this.chartColors.primary,
                        backgroundColor: this.chartColors.primary + '20',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: this.chartColors.primary,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4
                    }, {
                        label: 'Tasks Created',
                        data: dailyData.created,
                        borderColor: this.chartColors.info,
                        backgroundColor: this.chartColors.info + '20',
                        fill: false,
                        tension: 0.4,
                        pointBackgroundColor: this.chartColors.info,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    },
                    interaction: {
                        intersect: false
                    }
                }
            });

        } catch (error) {
            console.error('❌ Failed to initialize daily chart:', error);
        }
    }

    /**
     * Initialize category distribution chart (pie)
     */
    initCategoryChart() {
        try {
            const ctx = document.getElementById('category-chart');
            if (!ctx) return;

            const categoryData = this.getCategoryData();

            this.charts.category = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: categoryData.labels,
                    datasets: [{
                        data: categoryData.data,
                        backgroundColor: [
                            this.chartColors.primary,
                            this.chartColors.success,
                            this.chartColors.warning,
                            this.chartColors.danger,
                            this.chartColors.purple,
                            this.chartColors.pink,
                            this.chartColors.info
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 15
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label;
                                    const value = context.parsed;
                                    const total = categoryData.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return `${label}: ${value} tasks (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('❌ Failed to initialize category chart:', error);
        }
    }

    /**
     * Initialize priority breakdown chart (bar)
     */
    initPriorityChart() {
        try {
            const ctx = document.getElementById('priority-chart');
            if (!ctx) return;

            const priorityData = this.getPriorityData();

            this.charts.priority = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['High Priority', 'Medium Priority', 'Low Priority'],
                    datasets: [{
                        label: 'Active Tasks',
                        data: [
                            priorityData.high.active,
                            priorityData.medium.active,
                            priorityData.low.active
                        ],
                        backgroundColor: [
                            this.chartColors.danger,
                            this.chartColors.warning,
                            this.chartColors.info
                        ],
                        borderRadius: 4,
                        borderSkipped: false
                    }, {
                        label: 'Completed Tasks',
                        data: [
                            priorityData.high.completed,
                            priorityData.medium.completed,
                            priorityData.low.completed
                        ],
                        backgroundColor: [
                            this.chartColors.danger + '60',
                            this.chartColors.warning + '60',
                            this.chartColors.info + '60'
                        ],
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });

        } catch (error) {
            console.error('❌ Failed to initialize priority chart:', error);
        }
    }

    /**
     * Get completion statistics
     */
    getCompletionStats() {
        try {
            const periodTasks = this.getTasksForPeriod();
            
            const stats = {
                completed: 0,
                pending: 0,
                overdue: 0,
                total: periodTasks.length
            };

            const today = new Date().toISOString().split('T')[0];

            periodTasks.forEach(task => {
                if (task.status === 'completed') {
                    stats.completed++;
                } else if (task.dueDate && task.dueDate < today) {
                    stats.overdue++;
                } else {
                    stats.pending++;
                }
            });

            return stats;
        } catch (error) {
            console.error('❌ Failed to get completion stats:', error);
            return { completed: 0, pending: 0, overdue: 0, total: 0 };
        }
    }

    /**
     * Get daily progress data
     */
    getDailyProgressData() {
        try {
            const days = this.currentPeriod === 'week' ? 7 : 
                         this.currentPeriod === 'month' ? 30 : 365;
            
            const labels = [];
            const completed = [];
            const created = [];
            
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateString = date.toISOString().split('T')[0];
                
                // Format label based on period
                let label;
                if (this.currentPeriod === 'week') {
                    label = date.toLocaleDateString('en', { weekday: 'short' });
                } else if (this.currentPeriod === 'month') {
                    label = date.getDate().toString();
                } else {
                    label = date.toLocaleDateString('en', { month: 'short' });
                }
                
                labels.push(label);
                
                // Count completed tasks for this date
                const completedCount = this.tasks.filter(task => 
                    task.completedAt && task.completedAt.split('T')[0] === dateString
                ).length;
                
                // Count created tasks for this date
                const createdCount = this.tasks.filter(task => 
                    task.createdAt && task.createdAt.split('T')[0] === dateString
                ).length;
                
                completed.push(completedCount);
                created.push(createdCount);
            }
            
            return { labels, completed, created };
        } catch (error) {
            console.error('❌ Failed to get daily progress data:', error);
            return { labels: [], completed: [], created: [] };
        }
    }

    /**
     * Get category distribution data
     */
    getCategoryData() {
        try {
            const periodTasks = this.getTasksForPeriod();
            const categories = {};
            
            periodTasks.forEach(task => {
                const category = task.category || 'uncategorized';
                categories[category] = (categories[category] || 0) + 1;
            });
            
            const labels = Object.keys(categories).map(cat => 
                cat.charAt(0).toUpperCase() + cat.slice(1)
            );
            const data = Object.values(categories);
            
            return { labels, data };
        } catch (error) {
            console.error('❌ Failed to get category data:', error);
            return { labels: [], data: [] };
        }
    }

    /**
     * Get priority distribution data
     */
    getPriorityData() {
        try {
            const periodTasks = this.getTasksForPeriod();
            
            const priorities = {
                high: { active: 0, completed: 0 },
                medium: { active: 0, completed: 0 },
                low: { active: 0, completed: 0 }
            };
            
            periodTasks.forEach(task => {
                const priority = task.priority || 'medium';
                if (task.status === 'completed') {
                    priorities[priority].completed++;
                } else {
                    priorities[priority].active++;
                }
            });
            
            return priorities;
        } catch (error) {
            console.error('❌ Failed to get priority data:', error);
            return {
                high: { active: 0, completed: 0 },
                medium: { active: 0, completed: 0 },
                low: { active: 0, completed: 0 }
            };
        }
    }

    /**
     * Get tasks for current period
     */
    getTasksForPeriod() {
        try {
            const now = new Date();
            let startDate;
            
            switch (this.currentPeriod) {
                case 'week':
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate = new Date(now);
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    startDate = new Date(now);
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
                default:
                    startDate = new Date(0);
            }
            
            return this.tasks.filter(task => {
                const taskDate = new Date(task.createdAt);
                return taskDate >= startDate;
            });
        } catch (error) {
            console.error('❌ Failed to get tasks for period:', error);
            return [];
        }
    }

    /**
     * Set statistics period
     */
    setPeriod(period) {
        try {
            this.currentPeriod = period;
            
            // Update period buttons
            const periodBtns = document.querySelectorAll('.period-btn');
            periodBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.period === period);
            });
            
            // Update charts
            this.updateCharts();
            
            console.log(`✅ Statistics period set to: ${period}`);
            
        } catch (error) {
            console.error('❌ Failed to set statistics period:', error);
        }
    }

    /**
     * Refresh all statistics
     */
    refresh() {
        try {
            this.updateCharts();
            this.updateTimeStats();
            this.updateAchievements();
        } catch (error) {
            console.error('❌ Failed to refresh statistics:', error);
        }
    }

    /**
     * Update all charts
     */
    updateCharts() {
        try {
            if (typeof Chart === 'undefined') return;

            // Update completion chart
            if (this.charts.completion) {
                const stats = this.getCompletionStats();
                this.charts.completion.data.datasets[0].data = [
                    stats.completed, stats.pending, stats.overdue
                ];
                this.charts.completion.update('none');
            }

            // Update daily chart
            if (this.charts.daily) {
                const dailyData = this.getDailyProgressData();
                this.charts.daily.data.labels = dailyData.labels;
                this.charts.daily.data.datasets[0].data = dailyData.completed;
                this.charts.daily.data.datasets[1].data = dailyData.created;
                this.charts.daily.update('none');
            }

            // Update category chart
            if (this.charts.category) {
                const categoryData = this.getCategoryData();
                this.charts.category.data.labels = categoryData.labels;
                this.charts.category.data.datasets[0].data = categoryData.data;
                this.charts.category.update('none');
            }

            // Update priority chart
            if (this.charts.priority) {
                const priorityData = this.getPriorityData();
                this.charts.priority.data.datasets[0].data = [
                    priorityData.high.active,
                    priorityData.medium.active,
                    priorityData.low.active
                ];
                this.charts.priority.data.datasets[1].data = [
                    priorityData.high.completed,
                    priorityData.medium.completed,
                    priorityData.low.completed
                ];
                this.charts.priority.update('none');
            }

        } catch (error) {
            console.error('❌ Failed to update charts:', error);
        }
    }

    /**
     * Resize all charts
     */
    resizeCharts() {
        try {
            Object.values(this.charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        } catch (error) {
            console.error('❌ Failed to resize charts:', error);
        }
    }

    /**
     * Update time tracking statistics
     */
    updateTimeStats() {
        try {
            const timeStatsContainer = document.getElementById('time-stats');
            if (!timeStatsContainer) return;

            const periodTasks = this.getTasksForPeriod();
            const categories = {};
            let totalTime = 0;

            // Calculate time spent per category
            periodTasks.forEach(task => {
                const category = task.category || 'uncategorized';
                const timeSpent = task.timeSpent || 0;
                
                categories[category] = (categories[category] || 0) + timeSpent;
                totalTime += timeSpent;
            });

            // Generate HTML
            const timeStatsHTML = Object.entries(categories).map(([category, time]) => {
                const percentage = totalTime > 0 ? Math.round((time / totalTime) * 100) : 0;
                const hours = Math.floor(time / 60);
                const minutes = time % 60;
                
                return `
                    <div class="time-stat-item">
                        <div class="time-stat-category">
                            <span class="category-name">${category.charAt(0).toUpperCase() + category.slice(1)}</span>
                            <span class="time-percentage">${percentage}%</span>
                        </div>
                        <div class="time-stat-duration">
                            ${hours > 0 ? `${hours}h ` : ''}${minutes}m
                        </div>
                        <div class="time-stat-bar">
                            <div class="time-stat-fill" style="width: ${percentage}%; background-color: ${this.chartColors.primary}"></div>
                        </div>
                    </div>
                `;
            }).join('');

            timeStatsContainer.innerHTML = timeStatsHTML || '<p>No time tracking data available</p>';

        } catch (error) {
            console.error('❌ Failed to update time stats:', error);
        }
    }

    /**
     * Update achievements
     */
    updateAchievements() {
        try {
            const achievementsContainer = document.getElementById('achievements');
            if (!achievementsContainer) return;

            const stats = this.getCompletionStats();
            const achievements = this.calculateAchievements(stats);

            const achievementsHTML = achievements.map(achievement => `
                <div class="achievement-badge ${achievement.earned ? 'earned' : ''}">
                    <div class="achievement-icon">
                        <i data-feather="${achievement.icon}"></i>
                    </div>
                    <div class="achievement-title">${achievement.title}</div>
                    <div class="achievement-description">${achievement.description}</div>
                </div>
            `).join('');

            achievementsContainer.innerHTML = achievementsHTML;

            // Re-initialize feather icons
            if (typeof feather !== 'undefined') {
                feather.replace(achievementsContainer);
            }

        } catch (error) {
            console.error('❌ Failed to update achievements:', error);
        }
    }

    /**
     * Calculate achievements based on statistics
     */
    calculateAchievements(stats) {
        try {
            const totalTasks = this.tasks.length;
            const completedTasks = this.tasks.filter(t => t.status === 'completed').length;
            const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

            const achievements = [
                {
                    title: 'First Steps',
                    description: 'Create your first task',
                    icon: 'target',
                    earned: totalTasks > 0
                },
                {
                    title: 'Getting Started',
                    description: 'Complete your first task',
                    icon: 'check-circle',
                    earned: completedTasks > 0
                },
                {
                    title: 'Task Master',
                    description: 'Complete 10 tasks',
                    icon: 'award',
                    earned: completedTasks >= 10
                },
                {
                    title: 'Productivity Pro',
                    description: 'Complete 50 tasks',
                    icon: 'star',
                    earned: completedTasks >= 50
                },
                {
                    title: 'Perfectionist',
                    description: '100% completion rate',
                    icon: 'zap',
                    earned: completionRate === 100 && totalTasks >= 5
                },
                {
                    title: 'Streak Master',
                    description: 'Complete tasks 7 days in a row',
                    icon: 'trending-up',
                    earned: this.checkStreakAchievement(7)
                },
                {
                    title: 'Category Explorer',
                    description: 'Use all task categories',
                    icon: 'grid',
                    earned: this.checkCategoryAchievement()
                },
                {
                    title: 'Early Bird',
                    description: 'Complete 5 tasks before noon',
                    icon: 'sunrise',
                    earned: this.checkEarlyBirdAchievement()
                }
            ];

            return achievements;
        } catch (error) {
            console.error('❌ Failed to calculate achievements:', error);
            return [];
        }
    }

    /**
     * Check streak achievement
     */
    checkStreakAchievement(days) {
        try {
            const completedTasks = this.tasks.filter(t => t.status === 'completed' && t.completedAt);
            const dateGroups = {};

            // Group completed tasks by date
            completedTasks.forEach(task => {
                const date = task.completedAt.split('T')[0];
                dateGroups[date] = true;
            });

            const dates = Object.keys(dateGroups).sort();
            let currentStreak = 0;
            let maxStreak = 0;

            for (let i = 0; i < dates.length; i++) {
                if (i === 0 || this.isConsecutiveDay(dates[i - 1], dates[i])) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
                }
                maxStreak = Math.max(maxStreak, currentStreak);
            }

            return maxStreak >= days;
        } catch (error) {
            console.error('❌ Failed to check streak achievement:', error);
            return false;
        }
    }

    /**
     * Check if two dates are consecutive days
     */
    isConsecutiveDay(date1, date2) {
        try {
            const d1 = new Date(date1);
            const d2 = new Date(date2);
            const diffTime = Math.abs(d2 - d1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays === 1;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check category achievement
     */
    checkCategoryAchievement() {
        try {
            const categories = ['work', 'personal', 'health', 'education', 'shopping'];
            const usedCategories = new Set(this.tasks.map(t => t.category));
            return categories.every(cat => usedCategories.has(cat));
        } catch (error) {
            console.error('❌ Failed to check category achievement:', error);
            return false;
        }
    }

    /**
     * Check early bird achievement
     */
    checkEarlyBirdAchievement() {
        try {
            const earlyTasks = this.tasks.filter(task => {
                if (!task.completedAt) return false;
                const completedTime = new Date(task.completedAt);
                return completedTime.getHours() < 12;
            });
            return earlyTasks.length >= 5;
        } catch (error) {
            console.error('❌ Failed to check early bird achievement:', error);
            return false;
        }
    }

    /**
     * Export statistics data
     */
    exportStatistics() {
        try {
            return {
                period: this.currentPeriod,
                completionStats: this.getCompletionStats(),
                dailyProgress: this.getDailyProgressData(),
                categoryData: this.getCategoryData(),
                priorityData: this.getPriorityData(),
                achievements: this.calculateAchievements(this.getCompletionStats()),
                exportDate: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Failed to export statistics:', error);
            return null;
        }
    }

    /**
     * Get productivity insights
     */
    getProductivityInsights() {
        try {
            const stats = this.getCompletionStats();
            const insights = [];

            // Completion rate insight
            const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
            if (completionRate >= 80) {
                insights.push({
                    type: 'success',
                    message: `Excellent! You have a ${completionRate}% completion rate.`
                });
            } else if (completionRate >= 60) {
                insights.push({
                    type: 'warning',
                    message: `Good progress! Your completion rate is ${completionRate}%. Try to aim for 80%+.`
                });
            } else {
                insights.push({
                    type: 'info',
                    message: `Your completion rate is ${completionRate}%. Consider breaking large tasks into smaller ones.`
                });
            }

            // Overdue tasks insight
            if (stats.overdue > 0) {
                insights.push({
                    type: 'warning',
                    message: `You have ${stats.overdue} overdue task${stats.overdue > 1 ? 's' : ''}. Consider rescheduling or completing them.`
                });
            }

            // Daily progress insight
            const dailyData = this.getDailyProgressData();
            const avgDaily = dailyData.completed.length > 0 ? 
                dailyData.completed.reduce((a, b) => a + b, 0) / dailyData.completed.length : 0;
            
            if (avgDaily >= 3) {
                insights.push({
                    type: 'success',
                    message: `Great productivity! You complete an average of ${avgDaily.toFixed(1)} tasks per day.`
                });
            }

            return insights;
        } catch (error) {
            console.error('❌ Failed to get productivity insights:', error);
            return [];
        }
    }
}

// Add CSS for statistics components
const statisticsCSS = `
.time-stat-item {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 1rem;
    margin-bottom: 0.75rem;
}

.time-stat-category {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}

.category-name {
    font-weight: 500;
    color: var(--text-primary);
}

.time-percentage {
    color: var(--text-secondary);
    font-size: 0.875rem;
}

.time-stat-duration {
    color: var(--primary-color);
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.time-stat-bar {
    height: 6px;
    background-color: var(--bg-tertiary);
    border-radius: 3px;
    overflow: hidden;
}

.time-stat-fill {
    height: 100%;
    transition: width 0.3s ease;
    border-radius: 3px;
}

.achievement-badge {
    transition: all 0.3s ease;
}

.achievement-badge:not(.earned) {
    opacity: 0.5;
    filter: grayscale(100%);
}

.achievement-badge.earned {
    animation: achievementPulse 2s infinite;
}

@keyframes achievementPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.chart-container {
    position: relative;
    height: 250px;
    width: 100%;
}

@media (max-width: 768px) {
    .chart-container {
        height: 200px;
    }
    
    .time-stat-item {
        padding: 0.75rem;
    }
    
    .achievements {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }
}
`;

// Inject statistics CSS
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = statisticsCSS;
    document.head.appendChild(style);
}

// Make StatisticsManager globally available
if (typeof window !== 'undefined') {
    window.StatisticsManager = StatisticsManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatisticsManager;
}
