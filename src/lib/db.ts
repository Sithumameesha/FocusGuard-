import Dexie, { Table } from 'dexie';

// Monthly Budget Record
export interface MonthlyBudget {
  id: string; // "YYYY-MM", e.g. "2026-11"
  netSalary: number;
  fixedExpenses: { id: string; title: string; amount: number; isPaid: boolean }[];
  emergencyBuffer: number;
  createdAt: number;
}

// Transaction
export interface Expense {
  id?: number;
  amount: number;
  category: 'Food' | 'Fuel' | 'Groceries' | 'Bills' | 'Misc';
  note?: string;
  date: string; // "YYYY-MM-DD"
  timestamp: number;
}

// Work Task
export interface Task {
  id?: number;
  title: string;
  planningNotes?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  date: string; // "YYYY-MM-DD"
  createdAt: number;
  pomodoroCount?: number;
  completedAt?: number;
}

export interface UserSettings {
  key: string;
  value: string;
}

export class FocusGuardDatabase extends Dexie {
  monthlyBudgets!: Table<MonthlyBudget, string>;
  expenses!: Table<Expense, number>;
  tasks!: Table<Task, number>;
  settings!: Table<UserSettings, string>;

  constructor() {
    super('FocusGuardDB');
    this.version(1).stores({
      monthlyBudgets: 'id, createdAt',
      expenses: '++id, amount, category, date, timestamp',
      tasks: '++id, title, status, date, createdAt',
      settings: 'key'
    });
  }
}

export const db = new FocusGuardDatabase();
