/**
 * Calendar Manager - Handles calendar display, navigation, and task visualization
 * Provides interactive monthly/weekly calendar views with task integration
 */

class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'month';
        this.tasks = [];
        this.storage = null;
        this.weekStartsOn = 0; // 0 = Sunday, 1 = Monday
        this.monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        this.dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        this.isMobileMode = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.refresh = this.refresh.bind(this);
        this.generateCalendar = this.generateCalendar.bind(this);
        this.previousMonth = this.previousMonth.bind(this);
        this.nextMonth = this.nextMonth.bind(this);
        this.goToToday = this.goToToday.bind(this);
        this.handleDayClick = this.handleDayClick.bind(this);
    }

    /**
     * Initialize calendar manager
     */
    async init() {
        try {
            // Get storage instance
            this.storage = window.plannerApp?.getComponent('storage') || new StorageManager();
            
            // Load settings
            await this.loadSettings();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load tasks and generate initial calendar
            await this.loadTasks();
            this.generateCalendar();
            
            // Setup task update listener
            this.setupTaskUpdateListener();
            
            console.log('✅ CalendarManager initialized');
            
        } catch (error) {
            console.error('❌ CalendarManager initialization failed:', error);
            throw error;
        }
    }

    /**
     * Load calendar settings
     */
    async loadSettings() {
        try {
            if (this.storage) {
                const settings = await this.storage.getSetting('calendar', {});
                this.weekStartsOn = settings.weekStartsOn || 0;
                this.currentView = settings.defaultView || 'month';
            }
        } catch (error) {
            console.error('❌ Failed to load calendar settings:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        try {
            // Navigation buttons
            const prevBtn = document.getElementById('prev-month');
            const nextBtn = document.getElementById('next-month');
            const todayBtn = document.getElementById('today-btn');

            if (prevBtn) prevBtn.addEventListener('click', this.previousMonth);
            if (nextBtn) nextBtn.addEventListener('click', this.nextMonth);
            if (todayBtn) todayBtn.addEventListener('click', this.goToToday);

            // View toggle buttons
            const viewBtns = document.querySelectorAll('.view-btn');
            viewBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const view = e.target.dataset.view;
                    this.setView(view);
                });
            });

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (window.plannerApp?.currentView !== 'calendar') return;
                
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key) {
                        case 'ArrowLeft':
                            e.preventDefault();
                            this.previousMonth();
                            break;
                        case 'ArrowRight':
                            e.preventDefault();
                            this.nextMonth();
                            break;
                        case 'Home':
                            e.preventDefault();
                            this.goToToday();
                            break;
                    }
                }
            });

            console.log('✅ Calendar event listeners setup');

        } catch (error) {
            console.error('❌ Failed to setup calendar event listeners:', error);
        }
    }

    /**
     * Setup task update listener
     */
    setupTaskUpdateListener() {
        try {
            document.addEventListener('tasksUpdated', (e) => {
                this.tasks = e.detail.tasks || [];
                this.generateCalendar();
            });
        } catch (error) {
            console.error('❌ Failed to setup task update listener:', error);
        }
    }

    /**
     * Load tasks from storage
     */
    async loadTasks() {
        try {
            this.tasks = await this.storage.getAllTasks();
        } catch (error) {
            console.error('❌ Failed to load tasks for calendar:', error);
            this.tasks = [];
        }
    }

    /**
     * Refresh calendar display
     */
    refresh() {
        try {
            this.generateCalendar();
        } catch (error) {
            console.error('❌ Failed to refresh calendar:', error);
        }
    }

    /**
     * Generate calendar for current month
     */
    generateCalendar() {
        try {
            const calendarGrid = document.getElementById('calendar-grid');
            if (!calendarGrid) {
                console.error('❌ Calendar grid element not found');
                return;
            }

            // Update header
            this.updateCalendarHeader();

            // Clear existing content
            calendarGrid.innerHTML = '';

            if (this.currentView === 'month') {
                this.generateMonthView(calendarGrid);
            } else if (this.currentView === 'week') {
                this.generateWeekView(calendarGrid);
            }

            // Animate calendar appearance
            this.animateCalendar();

        } catch (error) {
            console.error('❌ Failed to generate calendar:', error);
        }
    }

    /**
     * Update calendar header
     */
    updateCalendarHeader() {
        try {
            const currentMonthElement = document.getElementById('current-month');
            if (currentMonthElement) {
                const monthYear = `${this.monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
                currentMonthElement.textContent = monthYear;
            }

            // Update view buttons
            const viewBtns = document.querySelectorAll('.view-btn');
            viewBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === this.currentView);
            });

        } catch (error) {
            console.error('❌ Failed to update calendar header:', error);
        }
    }

    /**
     * Generate month view
     */
    generateMonthView(container) {
        try {
            // Add weekday headers
            this.addWeekdayHeaders(container);

            // Get month data
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // Calculate start date (including previous month days)
            const startDate = new Date(firstDay);
            const dayOfWeek = (firstDay.getDay() - this.weekStartsOn + 7) % 7;
            startDate.setDate(startDate.getDate() - dayOfWeek);

            // Generate 6 weeks (42 days)
            const today = new Date();
            for (let i = 0; i < 42; i++) {
                const currentDay = new Date(startDate);
                currentDay.setDate(startDate.getDate() + i);
                
                const dayElement = this.createDayElement(currentDay, month, today);
                container.appendChild(dayElement);
            }

        } catch (error) {
            console.error('❌ Failed to generate month view:', error);
        }
    }


    /**
     * Generate week view
     */
    generateWeekView(container) {
        try {
            // Add weekday headers
            this.addWeekdayHeaders(container);

            // Get week start date
            const weekStart = this.getWeekStart(this.currentDate);
            const today = new Date();

            // Generate 7 days
            for (let i = 0; i < 7; i++) {
                const currentDay = new Date(weekStart);
                currentDay.setDate(weekStart.getDate() + i);
                
                const dayElement = this.createDayElement(currentDay, this.currentDate.getMonth(), today, true);
                container.appendChild(dayElement);
            }

        } catch (error) {
            console.error('❌ Failed to generate week view:', error);
        }
    }

    /**
     * Add weekday headers
     */
  addWeekdayHeaders(container) {
    try {
        const weekdaysContainer = document.createElement('div');
        weekdaysContainer.className = 'calendar-weekdays';

        //const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

        days.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'weekday';
            dayEl.textContent = day;
            weekdaysContainer.appendChild(dayEl);
        });

        container.appendChild(weekdaysContainer);
    } catch (error) {
        console.error("❌ Failed to add weekday headers:", error);
    }
}



    
    /**
     * Create day element
     */
    createDayElement(date, currentMonth, today, isWeekView = false) {
        try {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.dataset.date = date.toISOString().split('T')[0];

            // Add classes for styling
            const isToday = this.isSameDay(date, today);
            const isOtherMonth = !isWeekView && date.getMonth() !== currentMonth;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            if (isToday) dayElement.classList.add('today');
            if (isOtherMonth) dayElement.classList.add('other-month');
            if (isWeekend) dayElement.classList.add('weekend');

            // Get tasks for this date
            const dayTasks = this.getTasksForDate(date);
            if (dayTasks.length > 0) {
                dayElement.classList.add('has-tasks');
            }

            // Create day header
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            
            const dayNumber = document.createElement('span');
            dayNumber.className = 'day-number';
            dayNumber.textContent = date.getDate();
            dayHeader.appendChild(dayNumber);

            if (dayTasks.length > 0) {
                const indicator = document.createElement('div');
                indicator.className = 'day-indicator';
                dayHeader.appendChild(indicator);
            }

            dayElement.appendChild(dayHeader);

            // Create day content
            const dayContent = document.createElement('div');
            dayContent.className = 'calendar-day-content';
            
            // Add task previews (limit to 3 in month view, more in week view)
            const maxTasks = isWeekView ? 8 : 3;
            const visibleTasks = dayTasks.slice(0, maxTasks);
            
            visibleTasks.forEach(task => {
                const taskPreview = this.createTaskPreview(task);
                dayContent.appendChild(taskPreview);
            });

            // Add "more" indicator if there are additional tasks
            if (dayTasks.length > maxTasks) {
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'task-preview more';
                moreIndicator.textContent = `+${dayTasks.length - maxTasks} more`;
                dayContent.appendChild(moreIndicator);
            }

            dayElement.appendChild(dayContent);

            // Add click event listener
            dayElement.addEventListener('click', (e) => {
                this.handleDayClick(date, e);
            });

            // Add drag and drop support
            this.addDragDropSupport(dayElement, date);

            return dayElement;

        } catch (error) {
            console.error('❌ Failed to create day element:', error);
            return document.createElement('div');
        }
    }

    /**
     * Create task preview element
     */
    createTaskPreview(task) {
        try {
            const taskPreview = document.createElement('div');
            taskPreview.className = `task-preview priority-${task.priority}`;
            taskPreview.textContent = task.title;
            taskPreview.title = `${task.title} - ${task.priority} priority`;
            taskPreview.dataset.taskId = task.id;

            // Add click handler to open task
            taskPreview.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openTask(task.id);
            });

            return taskPreview;

        } catch (error) {
            console.error('❌ Failed to create task preview:', error);
            return document.createElement('div');
        }
    }

    /**
     * Add drag and drop support to day element
     */
    addDragDropSupport(dayElement, date) {
        try {
            // Add drop zone class
            dayElement.addEventListener('dragover', (e) => {
                e.preventDefault();
                dayElement.classList.add('drag-over');
            });

            dayElement.addEventListener('dragleave', (e) => {
                if (!dayElement.contains(e.relatedTarget)) {
                    dayElement.classList.remove('drag-over');
                }
            });

            dayElement.addEventListener('drop', (e) => {
                e.preventDefault();
                dayElement.classList.remove('drag-over');
                
                const taskId = e.dataTransfer.getData('text/plain');
                if (taskId) {
                    this.moveTaskToDate(taskId, date);
                }
            });

        } catch (error) {
            console.error('❌ Failed to add drag and drop support:', error);
        }
    }

    /**
     * Handle day click
     */
    handleDayClick(date, event) {
        try {
            // Don't trigger if clicking on a task preview
            if (event.target.classList.contains('task-preview')) {
                return;
            }

            // Open task modal with pre-filled date
            const taskManager = window.plannerApp?.getComponent('tasks');
            if (taskManager) {
                taskManager.openTaskModal();
                
                // Pre-fill the date
                setTimeout(() => {
                    const dateInput = document.getElementById('task-date');
                    if (dateInput) {
                        dateInput.value = date.toISOString().split('T')[0];
                    }
                }, 100);
            }

        } catch (error) {
            console.error('❌ Failed to handle day click:', error);
        }
    }

    /**
     * Open task for editing
     */
    openTask(taskId) {
        try {
            const taskManager = window.plannerApp?.getComponent('tasks');
            if (taskManager) {
                taskManager.editTask(taskId);
            }
        } catch (error) {
            console.error('❌ Failed to open task:', error);
        }
    }

    /**
     * Move task to a different date
     */
    async moveTaskToDate(taskId, date) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) return;

            const dateString = date.toISOString().split('T')[0];
            task.dueDate = dateString;
            task.updatedAt = new Date().toISOString();

            // Save task
            await this.storage.saveTask(task);
            
            // Update local tasks array
            const taskIndex = this.tasks.findIndex(t => t.id === taskId);
            if (taskIndex >= 0) {
                this.tasks[taskIndex] = task;
            }

            // Refresh calendar
            this.generateCalendar();
            
            // Trigger task update event
            const event = new CustomEvent('tasksUpdated', {
                detail: { tasks: this.tasks }
            });
            document.dispatchEvent(event);

            // Show notification
            NotificationManager.show('Task Moved', `Task moved to ${this.formatDate(date)}`, 'success');

        } catch (error) {
            console.error('❌ Failed to move task to date:', error);
            NotificationManager.show('Move Failed', 'Failed to move task. Please try again.', 'error');
        }
    }

    /**
     * Get tasks for a specific date
     */
    getTasksForDate(date) {
        try {
            const dateString = date.toISOString().split('T')[0];
            return this.tasks.filter(task => task.dueDate === dateString);
        } catch (error) {
            console.error('❌ Failed to get tasks for date:', error);
            return [];
        }
    }

    /**
     * Navigate to previous month
     */
    previousMonth() {
        try {
            if (this.currentView === 'month') {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            } else if (this.currentView === 'week') {
                this.currentDate.setDate(this.currentDate.getDate() - 7);
            }
            
            this.animateNavigation('left');
            
        } catch (error) {
            console.error('❌ Failed to navigate to previous month:', error);
        }
    }

    /**
     * Navigate to next month
     */
    nextMonth() {
        try {
            if (this.currentView === 'month') {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            } else if (this.currentView === 'week') {
                this.currentDate.setDate(this.currentDate.getDate() + 7);
            }
            
            this.animateNavigation('right');
            
        } catch (error) {
            console.error('❌ Failed to navigate to next month:', error);
        }
    }

    /**
     * Go to today
     */
    goToToday() {
        try {
            this.currentDate = new Date();
            this.generateCalendar();
            
            // Animate calendar
            this.animateCalendar();
            
        } catch (error) {
            console.error('❌ Failed to go to today:', error);
        }
    }

    /**
     * Set calendar view
     */
    setView(view) {
        try {
            if (view !== this.currentView) {
                this.currentView = view;
                this.generateCalendar();
                
                // Save setting
                if (this.storage) {
                    this.storage.setSetting('calendar', { 
                        defaultView: view,
                        weekStartsOn: this.weekStartsOn 
                    });
                }
            }
        } catch (error) {
            console.error('❌ Failed to set calendar view:', error);
        }
    }

    /**
     * Set mobile mode
     */
    setMobileMode(isMobile) {
        try {
            this.isMobileMode = isMobile;
            
            const calendarContainer = document.querySelector('.calendar-container');
            if (calendarContainer) {
                calendarContainer.classList.toggle('mobile-mode', isMobile);
            }
            
            // Regenerate calendar for mobile optimizations
            if (isMobile) {
                this.generateCalendar();
            }
            
        } catch (error) {
            console.error('❌ Failed to set mobile mode:', error);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        try {
            const isMobile = window.innerWidth <= 768;
            if (isMobile !== this.isMobileMode) {
                this.setMobileMode(isMobile);
            }
        } catch (error) {
            console.error('❌ Failed to handle calendar resize:', error);
        }
    }

    /**
     * Animate calendar navigation
     */
    animateNavigation(direction) {
        try {
            if (typeof gsap !== 'undefined') {
                const calendarGrid = document.getElementById('calendar-grid');
                if (calendarGrid) {
                    const slideDistance = direction === 'left' ? -100 : 100;
                    
                    gsap.fromTo(calendarGrid,
                        { x: slideDistance, opacity: 0.7 },
                        { 
                            x: 0, 
                            opacity: 1, 
                            duration: 0.4, 
                            ease: "power2.out",
                            onComplete: () => {
                                this.generateCalendar();
                            }
                        }
                    );
                }
            } else {
                this.generateCalendar();
            }
        } catch (error) {
            console.error('❌ Failed to animate navigation:', error);
            this.generateCalendar();
        }
    }

    /**
     * Animate calendar appearance
     */
    animateCalendar() {
        try {
            if (typeof gsap !== 'undefined') {
                const calendarDays = document.querySelectorAll('.calendar-day');
                gsap.fromTo(calendarDays,
                    { opacity: 0, scale: 0.9 },
                    { 
                        opacity: 1, 
                        scale: 1, 
                        duration: 0.3, 
                        stagger: 0.02,
                        ease: "power2.out" 
                    }
                );
            }
        } catch (error) {
            console.error('❌ Failed to animate calendar:', error);
        }
    }

    /**
     * Get week start date
     */
    getWeekStart(date) {
        try {
            const day = date.getDay();
            const diff = (day - this.weekStartsOn + 7) % 7;
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - diff);
            return weekStart;
        } catch (error) {
            console.error('❌ Failed to get week start:', error);
            return new Date(date);
        }
    }

    /**
     * Check if two dates are the same day
     */
    isSameDay(date1, date2) {
        try {
            return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0];
        } catch (error) {
            console.error('❌ Failed to compare dates:', error);
            return false;
        }
    }

    /**
     * Format date for display
     */
    formatDate(date) {
        try {
            return date.toLocaleDateString();
        } catch (error) {
            console.error('❌ Failed to format date:', error);
            return date.toString();
        }
    }

    /**
     * Get calendar data for export
     */
    getCalendarData() {
        try {
            return {
                currentDate: this.currentDate.toISOString(),
                currentView: this.currentView,
                weekStartsOn: this.weekStartsOn,
                tasks: this.tasks
            };
        } catch (error) {
            console.error('❌ Failed to get calendar data:', error);
            return null;
        }
    }

    /**
     * Set week start day
     */
    async setWeekStartsOn(dayIndex) {
        try {
            this.weekStartsOn = dayIndex;
            
            // Save setting
            if (this.storage) {
                await this.storage.setSetting('calendar', {
                    defaultView: this.currentView,
                    weekStartsOn: this.weekStartsOn
                });
            }
            
            // Regenerate calendar
            this.generateCalendar();
            
            console.log(`✅ Week starts on: ${this.dayNames[dayIndex]}`);
            
        } catch (error) {
            console.error('❌ Failed to set week start day:', error);
        }
    }
}

// Make CalendarManager globally available
if (typeof window !== 'undefined') {
    window.CalendarManager = CalendarManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalendarManager;
}
