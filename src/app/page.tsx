'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, MonthlyBudget, Expense, Task } from '@/lib/db';
import { calculateGuardrails, toMonthString, toDateString, formatCurrency } from '@/lib/guardrailEngine';
import { sound } from '@/lib/sound';

import { Header } from '@/components/Header';
import { BottomNav, ActiveTab } from '@/components/BottomNav';
import { PwaBanner } from '@/components/PwaBanner';
import { DailySpendCard } from '@/components/DailySpendCard';
import { FocusQueue } from '@/components/FocusQueue';
import { SalarySetup } from '@/components/SalarySetup';
import { ActivityHistory } from '@/components/ActivityHistory';
import { LogExpenseModal } from '@/components/LogExpenseModal';
import { SettingsModal } from '@/components/SettingsModal';

import { Utensils, Fuel, ShoppingCart, Receipt, Package, PlusCircle, ArrowRight, Target } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('guardrails');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Client state
  const [clientDate, setClientDate] = useState<Date | null>(null);
  const [currentMonthStr, setCurrentMonthStr] = useState<string>('');
  const [todayStr, setTodayStr] = useState<string>('');
  const [todayFormatted, setTodayFormatted] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    setClientDate(now);
    setCurrentMonthStr(toMonthString(now));
    setTodayStr(toDateString(now));
    setTodayFormatted(
      new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(now)
    );
  }, []);

  // Dexie live queries
  const budget = useLiveQuery<MonthlyBudget | undefined>(() => {
    if (!currentMonthStr) return Promise.resolve(undefined);
    return db.monthlyBudgets.get(currentMonthStr);
  }, [currentMonthStr]);

  const expenses = useLiveQuery<Expense[]>(() => {
    return db.expenses.orderBy('timestamp').reverse().toArray();
  }, []) || [];

  const tasks = useLiveQuery<Task[]>(() => {
    return db.tasks.toArray();
  }, []) || [];

  // Load preferences from db
  useEffect(() => {
    db.settings.get('currency').then((res) => {
      if (res?.value) setCurrencySymbol(res.value);
    });
    db.settings.get('sound').then((res) => {
      if (res?.value) {
        const enabled = res.value === 'true';
        setSoundEnabled(enabled);
        sound.setEnabled(enabled);
      }
    });
  }, []);

  const handleUpdateCurrency = async (newSymbol: string) => {
    setCurrencySymbol(newSymbol);
    await db.settings.put({ key: 'currency', value: newSymbol });
    sound.playTick();
  };

  const handleToggleSound = async () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    sound.setEnabled(nextVal);
    await db.settings.put({ key: 'sound', value: nextVal ? 'true' : 'false' });
    if (nextVal) sound.playTick();
  };

  // Run dynamic calculation engine safely with clientDate
  const analysis = calculateGuardrails(budget, expenses, clientDate || new Date(2026, 10, 1));

  // Count active focus tasks for badge
  const todayTasks = tasks.filter((t) => t.date === todayStr);
  const activeFocusCount = todayTasks.filter((t) => t.status !== 'DONE').length;
  const hasActiveTask = todayTasks.some((t) => t.status === 'IN_PROGRESS');

  // Filter today's expenses for preview on Guardrail tab
  const todayExpenses = expenses.filter((e) => e.date === todayStr);

  const CATEGORY_ICONS = {
    Food: Utensils,
    Fuel: Fuel,
    Groceries: ShoppingCart,
    Bills: Receipt,
    Misc: Package,
  };

  if (!clientDate) {
    return (
      <div className="min-h-screen bg-[#070a12] flex items-center justify-center text-slate-500 font-mono text-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
          <span>Starting FocusGuard OS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a12] flex flex-col justify-between">
      {/* Top Mobile Header */}
      <Header
        sprint={analysis.sprint}
        todayFormatted={todayFormatted}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currencySymbol={currencySymbol}
        hasActiveTask={hasActiveTask}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto pb-safe-nav">
        {/* iOS PWA Add to Home Screen Banner */}
        <PwaBanner />

        <div className="p-4 space-y-4">
          {/* TAB 1: Guardrail Spend (Dynamic Daily Engine) */}
          {activeTab === 'guardrails' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Hero Dynamic Safe Spend Widget */}
              <DailySpendCard
                analysis={analysis}
                currencySymbol={currencySymbol}
                onOpenLogModal={() => setIsLogModalOpen(true)}
                onOpenSalarySetup={() => setActiveTab('salary')}
                hasBudget={Boolean(budget)}
              />

              {/* Quick Focus Task Teaser */}
              {hasActiveTask ? (
                <div 
                  onClick={() => setActiveTab('focus')}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/20 border border-emerald-500/30 flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-500/50 transition active:scale-98"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                        Active Focus Flow
                      </div>
                      <div className="text-xs font-semibold text-white truncate">
                        {todayTasks.find((t) => t.status === 'IN_PROGRESS')?.title}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
              ) : (
                <div
                  onClick={() => setActiveTab('focus')}
                  className="p-3.5 rounded-2xl glass-panel border border-white/5 flex items-center justify-between gap-3 cursor-pointer hover:border-white/15 transition active:scale-98"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Daily Focus Queue</div>
                      <div className="text-[11px] text-slate-400">
                        {activeFocusCount === 0
                          ? 'Plan your top 3 daily priorities'
                          : `${activeFocusCount} of 3 items queued • Start 25m Pomodoro`}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              )}

              {/* Today's Logged Expenses Preview */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Logged Today ({todayExpenses.length})
                  </span>
                  <button
                    onClick={() => setIsLogModalOpen(true)}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Log Expense</span>
                  </button>
                </div>

                {todayExpenses.length === 0 ? (
                  <div className="p-5 rounded-2xl glass-panel text-center text-xs text-slate-400 border border-white/5">
                    No expenses logged today yet. Your safe spend is fully preserved!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayExpenses.map((expense) => {
                      const Icon = CATEGORY_ICONS[expense.category] || Package;
                      return (
                        <div
                          key={expense.id}
                          className="p-3 rounded-2xl glass-panel border border-white/[0.06] flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-slate-800/80 text-emerald-400 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-white block truncate">
                                {expense.category}
                              </span>
                              {expense.note && (
                                <span className="text-[11px] text-slate-400 block truncate">
                                  {expense.note}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-xs text-slate-200 shrink-0">
                            -{formatCurrency(expense.amount, currencySymbol)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Focus Flow Queue (Work Habit Control) */}
          {activeTab === 'focus' && (
            <div className="animate-in fade-in duration-200">
              <FocusQueue tasks={tasks} todayStr={todayStr} />
            </div>
          )}

          {/* TAB 3: Salary Setup (Day 1 Monthly Division) */}
          {activeTab === 'salary' && (
            <div className="animate-in fade-in duration-200">
              <SalarySetup
                currentBudget={budget}
                currencySymbol={currencySymbol}
                currentMonthStr={currentMonthStr}
                onSaved={() => setActiveTab('guardrails')}
              />
            </div>
          )}

          {/* TAB 4: Activity & History */}
          {activeTab === 'history' && (
            <div className="animate-in fade-in duration-200">
              <ActivityHistory
                expenses={expenses}
                currencySymbol={currencySymbol}
                sprint={analysis.sprint}
              />
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        focusBadgeCount={activeFocusCount}
        hasFreezeAlert={analysis.isWeeklyLimitReached}
      />

      {/* Modals */}
      <LogExpenseModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        currencySymbol={currencySymbol}
        currentRemainingToday={analysis.remainingToday}
        todayStr={todayStr}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currencySymbol={currencySymbol}
        onUpdateCurrency={handleUpdateCurrency}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />
    </div>
  );
}
