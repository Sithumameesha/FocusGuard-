'use client';

import React, { useState } from 'react';
import { X, Utensils, Fuel, ShoppingCart, Receipt, Package, Check, Sparkles } from 'lucide-react';
import { db, Expense } from '@/lib/db';
import { sound } from '@/lib/sound';
import { formatCurrency, toDateString } from '@/lib/guardrailEngine';

interface LogExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  currentRemainingToday: number;
  todayStr: string;
}

type ExpenseCategory = 'Food' | 'Fuel' | 'Groceries' | 'Bills' | 'Misc';

const CATEGORIES: { id: ExpenseCategory; label: string; icon: typeof Utensils; color: string }[] = [
  { id: 'Food', label: 'Food & Dining', icon: Utensils, color: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30' },
  { id: 'Fuel', label: 'Fuel / Commute', icon: Fuel, color: 'from-blue-500/20 to-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  { id: 'Groceries', label: 'Groceries', icon: ShoppingCart, color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30' },
  { id: 'Bills', label: 'Daily Bills', icon: Receipt, color: 'from-purple-500/20 to-indigo-500/10 text-purple-400 border-purple-500/30' },
  { id: 'Misc', label: 'Misc / Other', icon: Package, color: 'from-slate-500/20 to-zinc-500/10 text-slate-300 border-slate-500/30' },
];

export function LogExpenseModal({
  isOpen,
  onClose,
  currencySymbol,
  currentRemainingToday,
  todayStr,
}: LogExpenseModalProps) {
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayStr);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const enteredAmount = parseFloat(amountStr) || 0;
  const projectedRemainingToday = currentRemainingToday - enteredAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredAmount <= 0) return;

    try {
      setIsSubmitting(true);
      const newExpense: Expense = {
        amount: enteredAmount,
        category,
        note: note.trim() || undefined,
        date,
        timestamp: Date.now(),
      };

      await db.expenses.add(newExpense);
      sound.playExpenseLogged();
      
      // Reset & close
      setAmountStr('');
      setNote('');
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error('Failed to log expense:', err);
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = (val: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr((current + val).toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full sm:max-w-md bg-[#0d1322] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 pb-safe text-slate-100 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Log Expense</h3>
              <p className="text-[11px] text-slate-400">Updates dynamic safe spend instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto no-scrollbar pr-0.5">
          {/* Amount Input */}
          <div className="text-center py-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Expense Amount
            </label>
            <div className="inline-flex items-center justify-center gap-1.5 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-white/10 focus-within:border-emerald-500/50 shadow-inner">
              <span className="text-2xl font-bold text-emerald-400 font-mono">{currencySymbol}</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-36 bg-transparent text-3xl font-extrabold text-white text-center focus:outline-none placeholder:text-slate-600 font-mono"
              />
            </div>

            {/* Quick increment buttons */}
            <div className="flex items-center justify-center gap-2 mt-2.5">
              {[5, 10, 20, 50].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-mono text-slate-300 active:scale-95 transition"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time guardrail impact preview */}
          {enteredAmount > 0 && (
            <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
              projectedRemainingToday >= 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <span>Projected Today Remaining:</span>
              <span className="font-mono font-bold text-sm">
                {formatCurrency(projectedRemainingToday, currencySymbol)}
              </span>
            </div>
          )}

          {/* Category Chips */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs transition active:scale-98 ${
                      isSelected
                        ? `bg-gradient-to-r ${cat.color} font-bold shadow-md`
                        : 'bg-slate-900/60 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Note & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Lunch with team, Gas refuel"
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={enteredAmount <= 0 || isSubmitting}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-950/40 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98 transition mt-2"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Log {enteredAmount > 0 ? formatCurrency(enteredAmount, currencySymbol) : ''}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
