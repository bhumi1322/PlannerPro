const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { eq, and, desc, gte, lte } = require('drizzle-orm');
const { 
  pgTable, 
  serial, 
  text, 
  timestamp, 
  integer, 
  date,
  decimal,
  boolean
} = require('drizzle-orm/pg-core');

// Define the schema in JavaScript
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('pending'),
  priority: text('priority').notNull().default('medium'),
  category: text('category').notNull().default('personal'),
  dueDate: date('due_date'),
  dueTime: text('due_time'),
  tags: text('tags').array(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  key: text('key').notNull(),
  value: text('value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

const statistics = pgTable('statistics', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  date: date('date').notNull(),
  type: text('type').notNull(),
  data: text('data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  category: text('category').notNull(),
  paymentMethod: text('payment_method'),
  date: date('date').notNull(),
  location: text('location'),
  notes: text('notes'),
  tags: text('tags').array(),
  isRecurring: boolean('is_recurring').default(false),
  recurringType: text('recurring_type'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

const expenseCategories = pgTable('expense_categories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  color: text('color'),
  icon: text('icon'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Setup database connection
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: { users, tasks, settings, statistics, expenses, expenseCategories } });

// Database Storage Implementation
class DatabaseStorage {
  constructor() {
    this.defaultUserId = 1;
  }

  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser) {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Initialize default user if needed
  async ensureDefaultUser() {
    let user = await this.getUser(this.defaultUserId);
    if (!user) {
      user = await this.createUser({
        username: 'default_user',
        email: 'user@plannerpro.local'
      });
      this.defaultUserId = user.id;
    }
    return user.id;
  }

  async saveTask(task) {
    const userId = await this.ensureDefaultUser();
    
    // Convert the existing task format to database format
    const dbTask = {
      userId,
      title: task.title,
      description: task.description || null,
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      category: task.category || 'personal',
      dueDate: task.dueDate || null,
      dueTime: task.dueTime || null,
      tags: task.tags || [],
      completedAt: task.completedAt ? new Date(task.completedAt) : null,
      updatedAt: new Date()
    };

    if (task.id && typeof task.id === 'number') {
      // Update existing task
      const [updatedTask] = await db
        .update(tasks)
        .set(dbTask)
        .where(and(eq(tasks.id, task.id), eq(tasks.userId, userId)))
        .returning();
      
      return this.convertTaskFromDb(updatedTask);
    } else {
      // Create new task
      const [newTask] = await db
        .insert(tasks)
        .values(dbTask)
        .returning();
      
      return this.convertTaskFromDb(newTask);
    }
  }

  async getAllTasks(userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    const dbTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, actualUserId))
      .orderBy(desc(tasks.createdAt));
    
    return dbTasks.map(task => this.convertTaskFromDb(task));
  }

  async getTask(id, userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    const taskId = parseInt(id);
    
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, actualUserId)));
    
    return task ? this.convertTaskFromDb(task) : undefined;
  }

  async deleteTask(id, userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    const taskId = parseInt(id);
    
    await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, actualUserId)));
  }

  async getTasksByDateRange(startDate, endDate, userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    const dbTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, actualUserId));
    
    return dbTasks
      .filter(task => {
        if (!task.dueDate) return false;
        const taskDate = task.dueDate;
        return taskDate >= startDate && taskDate <= endDate;
      })
      .map(task => this.convertTaskFromDb(task));
  }

  async getTasksByCategory(category, userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    const dbTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, actualUserId), eq(tasks.category, category)));
    
    return dbTasks.map(task => this.convertTaskFromDb(task));
  }

  async setSetting(key, value, userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    const existingSetting = await db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, actualUserId), eq(settings.key, key)));
    
    const settingValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    if (existingSetting.length > 0) {
      await db
        .update(settings)
        .set({ value: settingValue, updatedAt: new Date() })
        .where(and(eq(settings.userId, actualUserId), eq(settings.key, key)));
    } else {
      await db
        .insert(settings)
        .values({
          userId: actualUserId,
          key,
          value: settingValue
        });
    }
  }

  async getSetting(key, defaultValue = null, userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    const [setting] = await db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, actualUserId), eq(settings.key, key)));
    
    if (!setting || !setting.value) return defaultValue;
    
    try {
      return JSON.parse(setting.value);
    } catch {
      return setting.value;
    }
  }

  async saveStatistic(date, type, data, userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    await db
      .insert(statistics)
      .values({
        userId: actualUserId,
        date,
        type,
        data: JSON.stringify(data)
      });
  }

  async getStatistics(userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    const dbStats = await db
      .select()
      .from(statistics)
      .where(eq(statistics.userId, actualUserId))
      .orderBy(desc(statistics.date));
    
    return dbStats.map(stat => ({
      date: stat.date,
      type: stat.type,
      data: stat.data ? JSON.parse(stat.data) : null
    }));
  }

  async exportData(userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    const userTasks = await this.getAllTasks(actualUserId);
    const userSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, actualUserId));
    const userStats = await this.getStatistics(actualUserId);
    
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      tasks: userTasks,
      settings: userSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {}),
      statistics: userStats
    };
  }

  async importData(data, userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    // Clear existing data
    await this.clearAll(actualUserId);
    
    // Import tasks
    if (data.tasks) {
      for (const task of data.tasks) {
        await this.saveTask({ ...task, id: undefined }); // Remove ID to create new
      }
    }
    
    // Import settings
    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        await this.setSetting(key, value, actualUserId);
      }
    }
  }

  async clearAll(userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    await db.delete(tasks).where(eq(tasks.userId, actualUserId));
    await db.delete(settings).where(eq(settings.userId, actualUserId));
    await db.delete(statistics).where(eq(statistics.userId, actualUserId));
    await db.delete(expenses).where(eq(expenses.userId, actualUserId));
    await db.delete(expenseCategories).where(eq(expenseCategories.userId, actualUserId));
  }

  // Expense management methods
  async saveExpense(expense, userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    if (expense.id) {
      // Update existing expense
      const [updatedExpense] = await db
        .update(expenses)
        .set({
          description: expense.description,
          amount: expense.amount.toString(),
          currency: expense.currency,
          category: expense.category,
          paymentMethod: expense.paymentMethod,
          date: expense.date,
          location: expense.location,
          notes: expense.notes,
          tags: expense.tags,
          isRecurring: expense.isRecurring,
          recurringType: expense.recurringType,
          updatedAt: new Date()
        })
        .where(and(eq(expenses.id, parseInt(expense.id)), eq(expenses.userId, actualUserId)))
        .returning();
      
      return this.convertExpenseFromDb(updatedExpense);
    } else {
      // Create new expense
      const [newExpense] = await db
        .insert(expenses)
        .values({
          userId: actualUserId,
          description: expense.description,
          amount: expense.amount.toString(),
          currency: expense.currency || 'USD',
          category: expense.category,
          paymentMethod: expense.paymentMethod || 'cash',
          date: expense.date,
          location: expense.location,
          notes: expense.notes,
          tags: expense.tags,
          isRecurring: expense.isRecurring || false,
          recurringType: expense.recurringType
        })
        .returning();
      
      return this.convertExpenseFromDb(newExpense);
    }
  }

  async getAllExpenses(userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    const dbExpenses = await db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, actualUserId))
      .orderBy(desc(expenses.date));
    
    return dbExpenses.map(expense => this.convertExpenseFromDb(expense));
  }

  async getExpense(id, userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    const [expense] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, parseInt(id)), eq(expenses.userId, actualUserId)));
    
    return expense ? this.convertExpenseFromDb(expense) : null;
  }

  async deleteExpense(id, userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    await db
      .delete(expenses)
      .where(and(eq(expenses.id, parseInt(id)), eq(expenses.userId, actualUserId)));
  }

  async getExpensesByDateRange(startDate, endDate, userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    const dbExpenses = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.userId, actualUserId),
        gte(expenses.date, startDate),
        lte(expenses.date, endDate)
      ))
      .orderBy(desc(expenses.date));
    
    return dbExpenses.map(expense => this.convertExpenseFromDb(expense));
  }

  async getExpensesByCategory(category, userId) {
    const actualUserId = userId || await this.ensureDefaultUser();
    
    const dbExpenses = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.userId, actualUserId), eq(expenses.category, category)))
      .orderBy(desc(expenses.date));
    
    return dbExpenses.map(expense => this.convertExpenseFromDb(expense));
  }

  convertExpenseFromDb(dbExpense) {
    return {
      id: dbExpense.id.toString(),
      description: dbExpense.description,
      amount: parseFloat(dbExpense.amount),
      currency: dbExpense.currency,
      category: dbExpense.category,
      paymentMethod: dbExpense.paymentMethod,
      date: dbExpense.date,
      location: dbExpense.location,
      notes: dbExpense.notes,
      tags: dbExpense.tags || [],
      isRecurring: dbExpense.isRecurring,
      recurringType: dbExpense.recurringType,
      createdAt: dbExpense.createdAt,
      updatedAt: dbExpense.updatedAt
    };
  }

  async saveAll() {
    // No-op for database storage as everything is automatically saved
  }

  async getStorageInfo() {
    const actualUserId = await this.ensureDefaultUser();
    
    const taskCount = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, actualUserId));
    
    return {
      type: 'PostgreSQL Database',
      taskCount: taskCount.length,
      available: true
    };
  }

  // Helper method to convert database task to frontend format
  convertTaskFromDb(dbTask) {
    return {
      id: dbTask.id.toString(), // Frontend expects string IDs
      title: dbTask.title,
      description: dbTask.description,
      status: dbTask.status,
      priority: dbTask.priority,
      category: dbTask.category,
      dueDate: dbTask.dueDate,
      dueTime: dbTask.dueTime,
      tags: dbTask.tags || [],
      completedAt: dbTask.completedAt?.toISOString(),
      createdAt: dbTask.createdAt.toISOString(),
      updatedAt: dbTask.updatedAt.toISOString()
    };
  }
}

const storage = new DatabaseStorage();

module.exports = { storage, DatabaseStorage };