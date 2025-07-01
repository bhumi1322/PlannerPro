const express = require('express');
const cors = require('cors');
const path = require('path');

// Import database storage - we'll use dynamic import for ES modules
let storage;

async function initializeStorage() {
  try {
    const { storage: dbStorage } = await import('./storage.js');
    storage = dbStorage;
    console.log('✅ Database storage initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database storage:', error);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '..')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Tasks endpoints
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await storage.getAllTasks();
    res.json({ tasks });
  } catch (error) {
    console.error('Error getting tasks:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

app.get('/api/tasks/:id', async (req, res) => {
  try {
    const task = await storage.getTask(req.params.id);
    if (task) {
      res.json({ task });
    } else {
      res.status(404).json({ error: 'Task not found' });
    }
  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const task = await storage.saveTask(req.body);
    res.json({ task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks', async (req, res) => {
  try {
    const task = await storage.saveTask(req.body);
    res.json({ task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await storage.deleteTask(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.get('/api/tasks/date-range', async (req, res) => {
  try {
    const { start, end } = req.query;
    const tasks = await storage.getTasksByDateRange(start, end);
    res.json({ tasks });
  } catch (error) {
    console.error('Error getting tasks by date range:', error);
    res.status(500).json({ error: 'Failed to get tasks by date range' });
  }
});

app.get('/api/tasks/category/:category', async (req, res) => {
  try {
    const tasks = await storage.getTasksByCategory(req.params.category);
    res.json({ tasks });
  } catch (error) {
    console.error('Error getting tasks by category:', error);
    res.status(500).json({ error: 'Failed to get tasks by category' });
  }
});

// Settings endpoints
app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    await storage.setSetting(key, value);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting value:', error);
    res.status(500).json({ error: 'Failed to set setting' });
  }
});

app.get('/api/settings/:key', async (req, res) => {
  try {
    const value = await storage.getSetting(req.params.key);
    res.json({ value });
  } catch (error) {
    console.error('Error getting setting:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
});

// Statistics endpoints
app.post('/api/statistics', async (req, res) => {
  try {
    const { date, type, data } = req.body;
    await storage.saveStatistic(date, type, data);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving statistic:', error);
    res.status(500).json({ error: 'Failed to save statistic' });
  }
});

app.get('/api/statistics', async (req, res) => {
  try {
    const statistics = await storage.getStatistics();
    res.json({ statistics });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Data management endpoints
app.get('/api/export', async (req, res) => {
  try {
    const data = await storage.exportData();
    res.json(data);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

app.post('/api/import', async (req, res) => {
  try {
    await storage.importData(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

app.post('/api/clear', async (req, res) => {
  try {
    await storage.clearAll();
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

app.get('/api/storage-info', async (req, res) => {
  try {
    const info = await storage.getStorageInfo();
    res.json(info);
  } catch (error) {
    console.error('Error getting storage info:', error);
    res.status(500).json({ error: 'Failed to get storage info' });
  }
});

// Expenses endpoints
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await storage.getAllExpenses();
    res.json({ expenses });
  } catch (error) {
    console.error('Error getting expenses:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

app.get('/api/expenses/:id', async (req, res) => {
  try {
    const expense = await storage.getExpense(req.params.id);
    if (expense) {
      res.json({ expense });
    } else {
      res.status(404).json({ error: 'Expense not found' });
    }
  } catch (error) {
    console.error('Error getting expense:', error);
    res.status(500).json({ error: 'Failed to get expense' });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const expense = await storage.saveExpense(req.body);
    res.status(201).json({ expense });
  } catch (error) {
    console.error('Error saving expense:', error);
    res.status(500).json({ error: 'Failed to save expense' });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const expenseData = { ...req.body, id: req.params.id };
    const expense = await storage.saveExpense(expenseData);
    res.json({ expense });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    await storage.deleteExpense(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

app.get('/api/expenses/category/:category', async (req, res) => {
  try {
    const expenses = await storage.getExpensesByCategory(req.params.category);
    res.json({ expenses });
  } catch (error) {
    console.error('Error getting expenses by category:', error);
    res.status(500).json({ error: 'Failed to get expenses by category' });
  }
});

app.get('/api/expenses/date-range/:startDate/:endDate', async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const expenses = await storage.getExpensesByDateRange(startDate, endDate);
    res.json({ expenses });
  } catch (error) {
    console.error('Error getting expenses by date range:', error);
    res.status(500).json({ error: 'Failed to get expenses by date range' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start server
async function startServer() {
  await initializeStorage();
  
  app.listen(PORT, () => {
    console.log(`🚀 API server running on port ${PORT}`);
  });
}

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

module.exports = app;