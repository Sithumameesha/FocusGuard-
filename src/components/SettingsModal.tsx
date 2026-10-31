'use client';

import React, { useState } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Volume2, 
  VolumeX, 
  Download, 
  Upload, 
  RotateCcw, 
  Sparkles, 
  Check, 
  ShieldAlert
} from 'lucide-react';
import { db, MonthlyBudget, Expense, Task } from '@/lib/db';
import { sound } from '@/lib/sound';
import { toDateString, toMonthString, DEFAULT_FIXED_EXPENSES } from '@/lib/guardrailEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  onUpdateCurrency: (symbol: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const CURRENCIES = ['$', '€', '£', '¥', '₹', 'Rs', 'LKR', '₩', 'C$', 'A$'];

export function SettingsModal({
  isOpen,
  onClose,
  currencySymbol,
  onUpdateCurrency,
  soundEnabled,
  onToggleSound,
}: SettingsModalProps) {
  const [seedSuccess, setSeedSuccess] = useState(false);

  if (!isOpen) return null;

  // Populate Demo Data
  const handleSeedDemoData = async () => {
    try {
      const today = new Date();
      const todayStr = toDateString(today);
      const currentMonthStr = toMonthString(today);

      // 1. Monthly Budget
      const demoBudget: MonthlyBudget = {
        id: currentMonthStr,
        netSalary: 4500,
        fixedExpenses: DEFAULT_FIXED_EXPENSES,
        emergencyBuffer: 450, // 10%
        createdAt: Date.now(),
      };
      await db.monthlyBudgets.put(demoBudget);

      // 2. Realistic Expenses
      // Discretionary pool = 4500 - 2030 - 450 = 2020
      // Weekly Cap = 2020 / 4 = 505
      // Base daily safe spend = 2020 / 28 = ~72.14
      await db.expenses.clear();
      const sampleExpenses: Expense[] = [
        {
          amount: 24.50,
          category: 'Food',
          note: 'Healthy lunch bowl',
          date: todayStr,
          timestamp: Date.now() - 3600000,
        },
        {
          amount: 35.00,
          category: 'Fuel',
          note: 'Commute fuel refill',
          date: todayStr,
          timestamp: Date.now() - 7200000,
        },
      ];
      for (const exp of sampleExpenses) {
        await db.expenses.add(exp);
      }

      // 3. Focus Tasks (max 3, exactly 1 IN_PROGRESS)
      await db.tasks.clear();
      const sampleTasks: Task[] = [
        {
          title: 'Finalize quarterly performance review report',
          planningNotes: 'Outline sections 1 & 2, verify budget variance metrics',
          status: 'IN_PROGRESS',
          date: todayStr,
          createdAt: Date.now() - 5400000,
          pomodoroCount: 1,
        },
        {
          title: 'Review team pull requests & architectural RFC',
          planningNotes: 'Focus on caching layer and IndexedDB synchronization',
          status: 'TODO',
          date: todayStr,
          createdAt: Date.now() - 3600000,
          pomodoroCount: 0,
        },
        {
          title: '30-minute deep work inbox zero cleanup',
          planningNotes: 'Batch respond to high-priority client inquiries',
          status: 'TODO',
          date: todayStr,
          createdAt: Date.now() - 1800000,
          pomodoroCount: 0,
        },
        {
          title: 'Morning planning and habit check-in',
          status: 'DONE',
          date: todayStr,
          createdAt: Date.now() - 10000000,
          completedAt: Date.now() - 9000000,
          pomodoroCount: 1,
        },
      ];

      for (const t of sampleTasks) {
        await db.tasks.add(t);
      }

      sound.playExpenseLogged();
      setSeedSuccess(true);
      setTimeout(() => {
        setSeedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to seed demo data:', err);
    }
  };

  // Clear all IndexedDB tables
  const handleClearAllData = async () => {
    if (confirm('Are you sure you want to clear all budget records, logged expenses, and tasks?')) {
      await db.monthlyBudgets.clear();
      await db.expenses.clear();
      await db.tasks.clear();
      sound.playWarning();
      onClose();
    }
  };

  // Export JSON Backup
  const handleExportBackup = async () => {
    const budgets = await db.monthlyBudgets.toArray();
    const expenses = await db.expenses.toArray();
    const tasks = await db.tasks.toArray();

    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      budgets,
      expenses,
      tasks,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusguard-backup-${toDateString(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    sound.playTick();
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (data.budgets && Array.isArray(data.budgets)) {
          await db.monthlyBudgets.clear();
          for (const b of data.budgets) {
            await db.monthlyBudgets.put(b);
          }
        }
        if (data.expenses && Array.isArray(data.expenses)) {
          await db.expenses.clear();
          for (const exp of data.expenses) {
            await db.expenses.add(exp);
          }
        }
        if (data.tasks && Array.isArray(data.tasks)) {
          await db.tasks.clear();
          for (const t of data.tasks) {
            await db.tasks.add(t);
          }
        }

        sound.playTaskDone();
        alert('Backup successfully restored!');
        onClose();
      } catch (err) {
        alert('Invalid backup file.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-md bg-[#0d1322] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 pb-safe text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Settings & Preferences</h3>
              <p className="text-[11px] text-slate-400">Offline IndexedDB storage & controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Currency Selector */}
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1.5">
              Currency Symbol
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CURRENCIES.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => onUpdateCurrency(sym)}
                  className={`w-9 h-8 rounded-xl font-mono text-xs font-bold transition active:scale-95 ${
                    currencySymbol === sym
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          {/* Sound FX Toggle */}
          <div className="p-3.5 rounded-2xl glass-panel border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Sound Effects</span>
                <span className="text-[10px] text-slate-400">Offline synthesized Web Audio cues</span>
              </div>
            </div>
            <button
              onClick={onToggleSound}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {soundEnabled ? 'Enabled' : 'Muted'}
            </button>
          </div>

          {/* Seed Demo Data Button */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0c1e28] to-[#09151e] border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Load Starter Demo Data</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Populate realistic salary guardrails, sprint expenses, and active focus tasks to test the full Pomodoro and safe spend engine immediately.
            </p>
            <button
              onClick={handleSeedDemoData}
              disabled={seedSuccess}
              className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              {seedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Demo Data Loaded!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Realistic Demo Scenario</span>
                </>
              )}
            </button>
          </div>

          {/* Backup & Restore */}
          <div className="p-3.5 rounded-2xl glass-panel border border-white/10 space-y-2">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block">
              Local Data Backup
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportBackup}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-white/5 flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <label className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-white/5 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Clear All */}
          <div className="pt-2">
            <button
              onClick={handleClearAllData}
              className="w-full py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset / Clear All Local Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
