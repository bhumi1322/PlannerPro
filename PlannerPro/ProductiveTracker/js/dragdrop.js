/**
 * Drag and Drop Manager - Handles drag and drop functionality for tasks and calendar integration
 * Provides intuitive task movement between dates and reordering within lists
 */

class DragDropManager {
    constructor() {
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedTaskId = null;
        this.dropZones = [];
        this.dragPreview = null;
        this.storage = null;
        this.tasks = [];
        this.dragStartPos = { x: 0, y: 0 };
        this.dragOffset = { x: 0, y: 0 };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.handleDragStart = this.handleDragStart.bind(this);
        this.handleDragEnd = this.handleDragEnd.bind(this);
        this.handleDragOver = this.handleDragOver.bind(this);
        this.handleDrop = this.handleDrop.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
    }

    /**
     * Initialize drag and drop manager
     */
    async init() {
        try {
            // Get storage instance
            this.storage = window.plannerApp?.getComponent('storage') || new StorageManager();
            
            // Load tasks
            await this.loadTasks();
            
            // Setup drag and drop listeners
            this.setupDragAndDrop();
            
            // Setup task update listener
            this.setupTaskUpdateListener();
            
            console.log('✅ DragDropManager initialized');
            
        } catch (error) {
            console.error('❌ DragDropManager initialization failed:', error);
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
            console.error('❌ Failed to load tasks for drag and drop:', error);
            this.tasks = [];
        }
    }

    /**
     * Setup task update listener
     */
    setupTaskUpdateListener() {
        try {
            document.addEventListener('tasksUpdated', (e) => {
                this.tasks = e.detail.tasks || [];
                this.refreshDragAndDrop();
            });
        } catch (error) {
            console.error('❌ Failed to setup task update listener:', error);
        }
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        try {
            // Setup task items drag and drop
            this.refreshDragAndDrop();
            
            // Setup global mouse events for custom drag preview
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseup', this.handleDragEnd);
            
            console.log('✅ Drag and drop setup complete');
            
        } catch (error) {
            console.error('❌ Failed to setup drag and drop:', error);
        }
    }

    /**
     * Refresh drag and drop listeners
     */
    refreshDragAndDrop() {
        try {
            // Setup task items
            this.setupTaskItemDrag();
            
            // Setup calendar drop zones
            this.setupCalendarDropZones();
            
            // Setup task list drop zones
            this.setupTaskListDropZones();
            
        } catch (error) {
            console.error('❌ Failed to refresh drag and drop:', error);
        }
    }

    /**
     * Setup task item dragging
     */
    setupTaskItemDrag() {
        try {
            const taskItems = document.querySelectorAll('.task-item');
            
            taskItems.forEach(item => {
                // Remove existing listeners
                item.removeEventListener('dragstart', this.handleDragStart);
                item.removeEventListener('dragend', this.handleDragEnd);
                item.removeEventListener('mousedown', this.handleMouseDown);
                
                // Add drag attributes
                item.draggable = true;
                item.style.cursor = 'grab';
                
                // Add event listeners
                item.addEventListener('dragstart', this.handleDragStart);
                item.addEventListener('dragend', this.handleDragEnd);
                item.addEventListener('mousedown', this.handleMouseDown);
                
                // Visual feedback on hover
                item.addEventListener('mouseenter', (e) => {
                    if (!this.isDragging) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }
                });
                
                item.addEventListener('mouseleave', (e) => {
                    if (!this.isDragging) {
                        e.target.style.transform = '';
                        e.target.style.boxShadow = '';
                    }
                });
            });
            
        } catch (error) {
            console.error('❌ Failed to setup task item drag:', error);
        }
    }

    /**
     * Setup calendar drop zones
     */
    setupCalendarDropZones() {
        try {
            const calendarDays = document.querySelectorAll('.calendar-day');
            
            calendarDays.forEach(day => {
                // Remove existing listeners
                day.removeEventListener('dragover', this.handleDragOver);
                day.removeEventListener('dragleave', this.handleDragLeave);
                day.removeEventListener('drop', this.handleDrop);
                
                // Add event listeners
                day.addEventListener('dragover', this.handleDragOver);
                day.addEventListener('dragleave', this.handleDragLeave);
                day.addEventListener('drop', this.handleDrop);
            });
            
        } catch (error) {
            console.error('❌ Failed to setup calendar drop zones:', error);
        }
    }

    /**
     * Setup task list drop zones
     */
    setupTaskListDropZones() {
        try {
            const taskList = document.getElementById('task-list');
            
            if (taskList) {
                // Remove existing listeners
                taskList.removeEventListener('dragover', this.handleDragOver);
                taskList.removeEventListener('drop', this.handleDrop);
                
                // Add event listeners
                taskList.addEventListener('dragover', this.handleDragOver);
                taskList.addEventListener('drop', this.handleDrop);
            }
            
        } catch (error) {
            console.error('❌ Failed to setup task list drop zones:', error);
        }
    }

    /**
     * Handle mouse down for custom drag preview
     */
    handleMouseDown = (e) => {
        try {
            if (e.button !== 0) return; // Only left mouse button
            
            const taskItem = e.currentTarget;
            const rect = taskItem.getBoundingClientRect();
            
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
        } catch (error) {
            console.error('❌ Failed to handle mouse down:', error);
        }
    }

    /**
     * Handle drag start
     */
    handleDragStart = (e) => {
        try {
            this.isDragging = true;
            this.draggedElement = e.target;
            this.draggedTaskId = e.target.dataset.taskId;
            
            // Set drag data
            e.dataTransfer.setData('text/plain', this.draggedTaskId);
            e.dataTransfer.effectAllowed = 'move';
            
            // Store drag start position
            this.dragStartPos = { x: e.clientX, y: e.clientY };
            
            // Add dragging class
            this.draggedElement.classList.add('dragging');
            this.draggedElement.style.cursor = 'grabbing';
            
            // Create custom drag preview
            this.createDragPreview(e);
            
            // Add visual feedback to drop zones
            this.highlightDropZones();
            
            // Animate other task items
            this.animateOtherTaskItems();
            
            console.log(`✅ Started dragging task: ${this.draggedTaskId}`);
            
        } catch (error) {
            console.error('❌ Failed to handle drag start:', error);
        }
    }

    /**
     * Handle drag end
     */
    handleDragEnd = (e) => {
        try {
            if (!this.isDragging) return;
            
            this.isDragging = false;
            
            // Remove visual feedback
            if (this.draggedElement) {
                this.draggedElement.classList.remove('dragging');
                this.draggedElement.style.cursor = 'grab';
                this.draggedElement.style.transform = '';
                this.draggedElement.style.boxShadow = '';
            }
            
            // Remove drag preview
            this.removeDragPreview();
            
            // Remove drop zone highlights
            this.removeDropZoneHighlights();
            
            // Reset other task items
            this.resetOtherTaskItems();
            
            // Reset drag state
            this.draggedElement = null;
            this.draggedTaskId = null;
            
            console.log('✅ Drag operation ended');
            
        } catch (error) {
            console.error('❌ Failed to handle drag end:', error);
        }
    }

    /**
     * Handle drag over
     */
    handleDragOver = (e) => {
        try {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const dropZone = e.currentTarget;
            
            // Add hover effect
            if (dropZone.classList.contains('calendar-day')) {
                dropZone.classList.add('drag-over');
            } else if (dropZone === document.getElementById('task-list')) {
                this.handleTaskListDragOver(e);
            }
            
        } catch (error) {
            console.error('❌ Failed to handle drag over:', error);
        }
    }

    /**
     * Handle drag leave
     */
    handleDragLeave = (e) => {
        try {
            const dropZone = e.currentTarget;
            
            // Only remove class if we're actually leaving the element
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
            
        } catch (error) {
            console.error('❌ Failed to handle drag leave:', error);
        }
    }

    /**
     * Handle drop
     */
    handleDrop = (e) => {
        try {
            e.preventDefault();
            
            const taskId = e.dataTransfer.getData('text/plain');
            const dropZone = e.currentTarget;
            
            // Remove visual feedback
            dropZone.classList.remove('drag-over');
            
            if (dropZone.classList.contains('calendar-day')) {
                // Dropped on calendar day
                const date = dropZone.dataset.date;
                this.moveTaskToDate(taskId, date);
            } else if (dropZone === document.getElementById('task-list')) {
                // Dropped on task list (reordering)
                this.handleTaskListDrop(e, taskId);
            }
            
        } catch (error) {
            console.error('❌ Failed to handle drop:', error);
        }
    }

    /**
     * Handle mouse move for custom drag preview
     */
    handleMouseMove = (e) => {
        try {
            if (this.isDragging && this.dragPreview) {
                this.updateDragPreviewPosition(e);
            }
        } catch (error) {
            console.error('❌ Failed to handle mouse move:', error);
        }
    }

    /**
     * Handle task list drag over for reordering
     */
    handleTaskListDragOver(e) {
        try {
            const taskList = document.getElementById('task-list');
            const taskItems = Array.from(taskList.querySelectorAll('.task-item:not(.dragging)'));
            
            // Find the element we're hovering over
            const afterElement = this.getDragAfterElement(taskList, e.clientY);
            
            // Remove existing drop indicators
            taskItems.forEach(item => item.classList.remove('drop-above', 'drop-below'));
            
            // Add drop indicator
            if (afterElement) {
                afterElement.classList.add('drop-above');
            } else if (taskItems.length > 0) {
                taskItems[taskItems.length - 1].classList.add('drop-below');
            }
            
        } catch (error) {
            console.error('❌ Failed to handle task list drag over:', error);
        }
    }

    /**
     * Handle task list drop for reordering
     */
    handleTaskListDrop(e, taskId) {
        try {
            const taskList = document.getElementById('task-list');
            const afterElement = this.getDragAfterElement(taskList, e.clientY);
            
            // Remove drop indicators
            const taskItems = Array.from(taskList.querySelectorAll('.task-item'));
            taskItems.forEach(item => item.classList.remove('drop-above', 'drop-below'));
            
            // Reorder task in the list
            this.reorderTask(taskId, afterElement);
            
        } catch (error) {
            console.error('❌ Failed to handle task list drop:', error);
        }
    }

    /**
     * Get the element after which the dragged item should be inserted
     */
    getDragAfterElement(container, y) {
        try {
            const draggableElements = Array.from(container.querySelectorAll('.task-item:not(.dragging)'));
            
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
            
        } catch (error) {
            console.error('❌ Failed to get drag after element:', error);
            return null;
        }
    }

    /**
     * Create custom drag preview
     */
    createDragPreview(e) {
        try {
            if (!this.draggedElement) return;
            
            // Clone the dragged element
            this.dragPreview = this.draggedElement.cloneNode(true);
            this.dragPreview.classList.add('drag-preview');
            this.dragPreview.style.position = 'fixed';
            this.dragPreview.style.pointerEvents = 'none';
            this.dragPreview.style.zIndex = '10000';
            this.dragPreview.style.width = this.draggedElement.offsetWidth + 'px';
            this.dragPreview.style.opacity = '0.8';
            this.dragPreview.style.transform = 'rotate(5deg)';
            this.dragPreview.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)';
            
            // Remove the task actions from preview
            const actions = this.dragPreview.querySelector('.task-actions');
            if (actions) actions.remove();
            
            document.body.appendChild(this.dragPreview);
            
            // Position it initially
            this.updateDragPreviewPosition(e);
            
        } catch (error) {
            console.error('❌ Failed to create drag preview:', error);
        }
    }

    /**
     * Update drag preview position
     */
    updateDragPreviewPosition(e) {
        try {
            if (!this.dragPreview) return;
            
            this.dragPreview.style.left = (e.clientX - this.dragOffset.x) + 'px';
            this.dragPreview.style.top = (e.clientY - this.dragOffset.y) + 'px';
            
        } catch (error) {
            console.error('❌ Failed to update drag preview position:', error);
        }
    }

    /**
     * Remove drag preview
     */
    removeDragPreview() {
        try {
            if (this.dragPreview && this.dragPreview.parentNode) {
                // Animate out if GSAP is available
                if (typeof gsap !== 'undefined') {
                    gsap.to(this.dragPreview, {
                        scale: 0.5,
                        opacity: 0,
                        duration: 0.2,
                        ease: "power2.in",
                        onComplete: () => {
                            if (this.dragPreview && this.dragPreview.parentNode) {
                                this.dragPreview.parentNode.removeChild(this.dragPreview);
                            }
                        }
                    });
                } else {
                    this.dragPreview.parentNode.removeChild(this.dragPreview);
                }
            }
            this.dragPreview = null;
        } catch (error) {
            console.error('❌ Failed to remove drag preview:', error);
        }
    }

    /**
     * Highlight drop zones
     */
    highlightDropZones() {
        try {
            const calendarDays = document.querySelectorAll('.calendar-day');
            const taskList = document.getElementById('task-list');
            
            calendarDays.forEach(day => {
                day.classList.add('drop-zone-active');
            });
            
            if (taskList) {
                taskList.classList.add('drop-zone-active');
            }
            
        } catch (error) {
            console.error('❌ Failed to highlight drop zones:', error);
        }
    }

    /**
     * Remove drop zone highlights
     */
    removeDropZoneHighlights() {
        try {
            const dropZones = document.querySelectorAll('.drop-zone-active, .drag-over');
            dropZones.forEach(zone => {
                zone.classList.remove('drop-zone-active', 'drag-over', 'drop-above', 'drop-below');
            });
            
        } catch (error) {
            console.error('❌ Failed to remove drop zone highlights:', error);
        }
    }

    /**
     * Animate other task items during drag
     */
    animateOtherTaskItems() {
        try {
            if (typeof gsap !== 'undefined') {
                const otherItems = document.querySelectorAll('.task-item:not(.dragging)');
                gsap.to(otherItems, {
                    scale: 0.95,
                    opacity: 0.7,
                    duration: 0.3,
                    ease: "power2.out"
                });
            }
        } catch (error) {
            console.error('❌ Failed to animate other task items:', error);
        }
    }

    /**
     * Reset other task items after drag
     */
    resetOtherTaskItems() {
        try {
            if (typeof gsap !== 'undefined') {
                const otherItems = document.querySelectorAll('.task-item:not(.dragging)');
                gsap.to(otherItems, {
                    scale: 1,
                    opacity: 1,
                    duration: 0.3,
                    ease: "power2.out"
                });
            }
        } catch (error) {
            console.error('❌ Failed to reset other task items:', error);
        }
    }

    /**
     * Move task to a specific date
     */
    async moveTaskToDate(taskId, dateString) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) {
                console.error('❌ Task not found:', taskId);
                return;
            }

            // Update task date
            task.dueDate = dateString;
            task.updatedAt = new Date().toISOString();

            // Save to storage
            await this.storage.saveTask(task);
            
            // Update local tasks array
            const taskIndex = this.tasks.findIndex(t => t.id === taskId);
            if (taskIndex >= 0) {
                this.tasks[taskIndex] = task;
            }

            // Trigger refresh for other components
            this.triggerTaskUpdate();
            
            // Show success notification
            const date = new Date(dateString);
            const formattedDate = date.toLocaleDateString();
            NotificationManager.show('Task Moved', `Task moved to ${formattedDate}`, 'success');
            
            console.log(`✅ Task moved to ${dateString}: ${task.title}`);

        } catch (error) {
            console.error('❌ Failed to move task to date:', error);
            NotificationManager.show('Move Failed', 'Failed to move task. Please try again.', 'error');
        }
    }

    /**
     * Reorder task in the list
     */
    async reorderTask(taskId, afterElement) {
        try {
            // For now, we'll just trigger a refresh
            // In a more advanced implementation, you might want to save task order
            this.triggerTaskUpdate();
            
            NotificationManager.show('Task Reordered', 'Task order updated', 'info');
            
        } catch (error) {
            console.error('❌ Failed to reorder task:', error);
        }
    }

    /**
     * Trigger task update event
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
     * Enable drag and drop
     */
    enable() {
        try {
            this.refreshDragAndDrop();
            console.log('✅ Drag and drop enabled');
        } catch (error) {
            console.error('❌ Failed to enable drag and drop:', error);
        }
    }

    /**
     * Disable drag and drop
     */
    disable() {
        try {
            const taskItems = document.querySelectorAll('.task-item');
            taskItems.forEach(item => {
                item.draggable = false;
                item.style.cursor = 'default';
            });
            
            this.removeDropZoneHighlights();
            
            console.log('✅ Drag and drop disabled');
        } catch (error) {
            console.error('❌ Failed to disable drag and drop:', error);
        }
    }

    /**
     * Get drag and drop statistics
     */
    getStatistics() {
        try {
            return {
                isDragging: this.isDragging,
                draggedTaskId: this.draggedTaskId,
                dropZoneCount: document.querySelectorAll('.calendar-day').length,
                draggableTaskCount: document.querySelectorAll('.task-item[draggable="true"]').length
            };
        } catch (error) {
            console.error('❌ Failed to get drag and drop statistics:', error);
            return null;
        }
    }
}

// Add CSS for drag and drop effects
const dragDropCSS = `
.task-item.dragging {
    opacity: 0.5;
    transform: rotate(5deg) scale(1.05);
    z-index: 1000;
    transition: none;
}

.calendar-day.drop-zone-active {
    border: 2px dashed var(--primary-color);
    background-color: rgba(79, 70, 229, 0.05);
    transition: all 0.2s ease;
}

.calendar-day.drag-over {
    border-color: var(--primary-color);
    background-color: rgba(79, 70, 229, 0.1);
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
}

.task-list.drop-zone-active {
    background-color: rgba(79, 70, 229, 0.02);
    border-radius: var(--radius-lg);
}

.task-item.drop-above {
    border-top: 3px solid var(--primary-color);
    margin-top: 8px;
}

.task-item.drop-below {
    border-bottom: 3px solid var(--primary-color);
    margin-bottom: 8px;
}

.drag-preview {
    user-select: none;
    transform-origin: center;
    transition: none !important;
}

@media (max-width: 768px) {
    .task-item.dragging {
        transform: rotate(2deg) scale(1.02);
    }
    
    .calendar-day.drag-over {
        transform: scale(1.01);
    }
}

/* Touch devices drag feedback */
@media (hover: none) and (pointer: coarse) {
    .task-item:active {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }
    
    .calendar-day:active {
        background-color: rgba(79, 70, 229, 0.1);
    }
}
`;

// Inject drag and drop CSS
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = dragDropCSS;
    document.head.appendChild(style);
}

// Make DragDropManager globally available
if (typeof window !== 'undefined') {
    window.DragDropManager = DragDropManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DragDropManager;
}
