'use client';

import React, { useState } from 'react';
import { 
  Utensils, 
  Fuel, 
  ShoppingCart, 
  Receipt, 
  Package, 
  Trash2, 
  Calendar, 
  PieChart, 
  Sparkles 
} from 'lucide-react';
import { db, Expense } from '@/lib/db';
import { formatCurrency, SprintInfo } from '@/lib/guardrailEngine';
import { sound } from '@/lib/sound';

interface ActivityHistoryProps {
  expenses: Expense[];
  currencySymbol: string;
  sprint: SprintInfo;
}

const CATEGORY_META = {
  Food: { label: 'Food & Dining', icon: Utensils, color: 'text-amber-400 bg-amber-500/20' },
  Fuel: { label: 'Fuel / Commute', icon: Fuel, color: 'text-cyan-400 bg-cyan-500/20' },
  Groceries: { label: 'Groceries', icon: ShoppingCart, color: 'text-emerald-400 bg-emerald-500/20' },
  Bills: { label: 'Daily Bills', icon: Receipt, color: 'text-purple-400 bg-purple-500/20' },
  Misc: { label: 'Misc / Other', icon: Package, color: 'text-slate-300 bg-slate-500/20' },
};

export function ActivityHistory({
  expenses,
  currencySymbol,
  sprint,
}: ActivityHistoryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Filter expenses
  const sprintExpenses = expenses.filter(
    (e) => e.date >= sprint.startDateStr && e.date <= sprint.endDateStr
  );

  const totalSprintSpend = sprintExpenses.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

  // Group by category for sprint breakdown
  const categoryTotals: Record<string, number> = {
    Food: 0,
    Fuel: 0,
    Groceries: 0,
    Bills: 0,
    Misc: 0,
  };

  sprintExpenses.forEach((e) => {
    if (categoryTotals[e.category] !== undefined) {
      categoryTotals[e.category] += Number(e.amount) || 0;
    } else {
      categoryTotals.Misc += Number(e.amount) || 0;
    }
  });

  const filteredList = (selectedCategory === 'ALL'
    ? expenses
    : expenses.filter((e) => e.category === selectedCategory)
  ).slice(0, 50); // limit to recent 50

  const handleDeleteExpense = async (id?: number) => {
    if (!id) return;
    if (confirm('Delete this expense? Daily safe spend will adjust automatically.')) {
      await db.expenses.delete(id);
      sound.playTick();
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-1.5">
          <PieChart className="w-4 h-4 text-emerald-400" />
          <span>Sprint {sprint.sprintNumber} Activity Breakdown</span>
        </h2>
        <p className="text-[11px] text-slate-400">
          Total sprint spend: <span className="text-white font-mono font-semibold">{formatCurrency(totalSprintSpend, currencySymbol)}</span>
        </p>
      </div>

      {/* Category Breakdown Bars */}
      <div className="p-4 rounded-3xl glass-panel-elevated border border-white/10 space-y-2.5">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
          Spending by Category (Sprint {sprint.sprintNumber})
        </span>

        {Object.entries(categoryTotals).map(([catKey, total]) => {
          const meta = CATEGORY_META[catKey as keyof typeof CATEGORY_META];
          const Icon = meta.icon;
          const pct = totalSprintSpend > 0 ? Math.round((total / totalSprintSpend) * 100) : 0;

          return (
            <div key={catKey}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{meta.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-[11px]">{pct}%</span>
                  <span className="font-mono font-bold text-white">
                    {formatCurrency(total, currencySymbol)}
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {['ALL', 'Food', 'Fuel', 'Groceries', 'Bills', 'Misc'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95 ${
              selectedCategory === cat
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Expense List */}
      <div className="space-y-2">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block px-1">
          Recent Logged Expenses ({filteredList.length})
        </span>

        {filteredList.length === 0 ? (
          <div className="p-6 rounded-2xl glass-panel text-center text-xs text-slate-400 border border-dashed border-white/10">
            No expenses logged yet in this category.
          </div>
        ) : (
          filteredList.map((expense) => {
            const meta = CATEGORY_META[expense.category] || CATEGORY_META.Misc;
            const Icon = meta.icon;

            return (
              <div
                key={expense.id}
                className="p-3 rounded-2xl glass-panel border border-white/[0.07] flex items-center justify-between gap-3 hover:border-white/20 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-0.5 font-mono">
                        <Calendar className="w-2.5 h-2.5" />
                        {expense.date}
                      </span>
                    </div>
                    {expense.note && (
                      <p className="text-[11px] text-slate-400 truncate">
                        {expense.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-sm text-slate-100">
                    -{formatCurrency(expense.amount, currencySymbol)}
                  </span>
                  <button
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
