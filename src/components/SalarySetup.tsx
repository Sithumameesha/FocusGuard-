'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  Shield, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  PieChart
} from 'lucide-react';
import { db, MonthlyBudget } from '@/lib/db';
import { sound } from '@/lib/sound';
import { 
  formatCurrency, 
  toMonthString, 
  DEFAULT_FIXED_EXPENSES 
} from '@/lib/guardrailEngine';

interface SalarySetupProps {
  currentBudget?: MonthlyBudget;
  currencySymbol: string;
  currentMonthStr: string;
  onSaved?: () => void;
}

export function SalarySetup({
  currentBudget,
  currencySymbol,
  currentMonthStr,
  onSaved,
}: SalarySetupProps) {
  const [monthId, setMonthId] = useState(currentBudget?.id || currentMonthStr);
  const [netSalaryStr, setNetSalaryStr] = useState(currentBudget?.netSalary?.toString() || '4500');
  
  // Fixed non-negotiables
  const [fixedExpenses, setFixedExpenses] = useState(
    currentBudget?.fixedExpenses || DEFAULT_FIXED_EXPENSES
  );

  // Emergency Buffer: percentage or amount
  const [bufferPercent, setBufferPercent] = useState<number | null>(
    currentBudget ? Math.round((currentBudget.emergencyBuffer / (currentBudget.netSalary || 1)) * 100) : 10
  );
  const [customBufferStr, setCustomBufferStr] = useState(
    currentBudget?.emergencyBuffer?.toString() || '450'
  );

  // New commitment input
  const [newTitle, setNewTitle] = useState('');
  const [newAmountStr, setNewAmountStr] = useState('');
  const [isAddingCommitment, setIsAddingCommitment] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // When currentBudget changes externally
  useEffect(() => {
    if (currentBudget) {
      setMonthId(currentBudget.id);
      setNetSalaryStr(currentBudget.netSalary.toString());
      setFixedExpenses(currentBudget.fixedExpenses);
      setCustomBufferStr(currentBudget.emergencyBuffer.toString());
    }
  }, [currentBudget]);

  const netSalary = parseFloat(netSalaryStr) || 0;

  // Calculate Emergency Buffer
  let emergencyBuffer = 0;
  if (bufferPercent !== null) {
    emergencyBuffer = (netSalary * bufferPercent) / 100;
  } else {
    emergencyBuffer = parseFloat(customBufferStr) || 0;
  }

  // Calculations
  const sumFixedCommitments = fixedExpenses.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  const paidFixedCommitments = fixedExpenses
    .filter((item) => item.isPaid)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const discretionaryPool = Math.max(0, netSalary - sumFixedCommitments - emergencyBuffer);
  const weeklyCap = discretionaryPool / 4;
  const baseDailyAllowance = discretionaryPool / 28;

  // Toggle paid status of a commitment
  const handleTogglePaid = (id: string) => {
    setFixedExpenses((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isPaid: !item.isPaid } : item
      )
    );
    sound.playTick();
  };

  // Delete commitment
  const handleDeleteCommitment = (id: string) => {
    setFixedExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  // Add new commitment
  const handleAddCommitment = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newAmountStr);
    if (!newTitle.trim() || isNaN(amount) || amount <= 0) return;

    setFixedExpenses((prev) => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        title: newTitle.trim(),
        amount,
        isPaid: false,
      },
    ]);
    setNewTitle('');
    setNewAmountStr('');
    setIsAddingCommitment(false);
    sound.playTick();
  };

  // Update existing commitment amount
  const handleUpdateAmount = (id: string, newAmt: number) => {
    setFixedExpenses((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, amount: isNaN(newAmt) ? 0 : newAmt } : item
      )
    );
  };

  // Save to Dexie IndexedDB
  const handleSaveBudget = async () => {
    if (netSalary <= 0) {
      alert('Please enter a valid net monthly salary.');
      return;
    }

    const budgetToSave: MonthlyBudget = {
      id: monthId,
      netSalary,
      fixedExpenses,
      emergencyBuffer,
      createdAt: currentBudget?.createdAt || Date.now(),
    };

    await db.monthlyBudgets.put(budgetToSave);
    sound.playExpenseLogged();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    if (onSaved) onSaved();
  };

  return (
    <div className="space-y-5">
      {/* Title & Month Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Monthly Salary Setup</span>
          </h2>
          <p className="text-[11px] text-slate-400">
            Day 1 guardrail division into weekly & daily allowances.
          </p>
        </div>

        {/* Month Selector */}
        <input
          type="month"
          value={monthId}
          onChange={(e) => setMonthId(e.target.value)}
          className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* 1. Net Monthly Salary Card */}
      <div className="p-4 rounded-3xl glass-panel-elevated border border-white/10">
        <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1.5">
          1. Net Monthly Salary
        </label>
        <div className="flex items-center gap-2 bg-slate-900/90 rounded-2xl px-4 py-2.5 border border-white/10 focus-within:border-emerald-500/50">
          <span className="text-2xl font-bold text-emerald-400 font-mono">{currencySymbol}</span>
          <input
            type="number"
            step="1"
            min="0"
            value={netSalaryStr}
            onChange={(e) => setNetSalaryStr(e.target.value)}
            placeholder="e.g. 4500"
            className="w-full bg-transparent text-2xl font-extrabold text-white font-mono focus:outline-none"
          />
        </div>
      </div>

      {/* 2. Fixed Non-Negotiables */}
      <div className="p-4 rounded-3xl glass-panel border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-300 block">
              2. Fixed Non-Negotiables ({fixedExpenses.length})
            </label>
            <p className="text-[10px] text-slate-400">
              Rent, Bike Finance, Bank Loans, Utility Baselines
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-200">
            {formatCurrency(sumFixedCommitments, currencySymbol)}
          </span>
        </div>

        {/* Commitment List */}
        <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-0.5">
          {fixedExpenses.map((item) => (
            <div
              key={item.id}
              className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition ${
                item.isPaid
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900/60 border-white/5 text-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => handleTogglePaid(item.id)}
                className="flex items-center gap-2 min-w-0 text-left flex-1"
                title={item.isPaid ? 'Mark as unpaid' : 'Mark as paid'}
              >
                {item.isPaid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <span className={`text-xs font-medium truncate ${item.isPaid ? 'line-through text-slate-400' : ''}`}>
                  {item.title}
                </span>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-slate-400 font-mono">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  value={item.amount}
                  onChange={(e) => handleUpdateAmount(item.id, parseFloat(e.target.value))}
                  className="w-16 bg-slate-950/70 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-right font-mono text-white focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteCommitment(item.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Commitment inline form */}
        {isAddingCommitment ? (
          <form onSubmit={handleAddCommitment} className="p-3 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <span>Add Fixed Non-Negotiable</span>
              <button
                type="button"
                onClick={() => setIsAddingCommitment(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                required
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title (e.g. Wi-Fi)"
                className="col-span-2 bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
              <input
                type="number"
                required
                min="1"
                value={newAmountStr}
                onChange={(e) => setNewAmountStr(e.target.value)}
                placeholder="Amount"
                className="bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <button
              type="submit"
              className="w-full py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
            >
              Add Commitment
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingCommitment(true)}
            className="w-full py-2 rounded-xl border border-dashed border-white/15 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/30 text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Non-Negotiable</span>
          </button>
        )}

        <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
          <span>Paid so far: <span className="text-emerald-400 font-mono font-semibold">{formatCurrency(paidFixedCommitments, currencySymbol)}</span></span>
          <span>Pending: <span className="text-amber-400 font-mono font-semibold">{formatCurrency(sumFixedCommitments - paidFixedCommitments, currencySymbol)}</span></span>
        </div>
      </div>

      {/* 3. Emergency Buffer */}
      <div className="p-4 rounded-3xl glass-panel border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-300 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>3. Emergency Buffer</span>
          </label>
          <span className="font-mono text-xs font-bold text-emerald-400">
            {formatCurrency(emergencyBuffer, currencySymbol)}
          </span>
        </div>

        {/* Preset chips */}
        <div className="grid grid-cols-4 gap-2">
          {[0, 5, 10, null].map((pct, idx) => {
            const isSelected = pct === bufferPercent;
            const label = pct === null ? 'Custom' : `${pct}%`;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setBufferPercent(pct);
                  if (pct !== null) {
                    setCustomBufferStr(((netSalary * pct) / 100).toString());
                  }
                }}
                className={`py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {bufferPercent === null && (
          <div className="flex items-center gap-2 bg-slate-900/90 rounded-xl px-3 py-1.5 border border-white/10 mt-2">
            <span className="text-xs text-slate-400 font-mono">{currencySymbol}</span>
            <input
              type="number"
              min="0"
              value={customBufferStr}
              onChange={(e) => setCustomBufferStr(e.target.value)}
              placeholder="Custom buffer amount"
              className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* 4. Real-time Live Guardrail Engine Breakdown */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0c1828] to-[#0a121e] border-2 border-emerald-500/40 shadow-xl space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          <PieChart className="w-4 h-4" />
          <span>Calculated Behavioral Guardrails</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          {/* Discretionary Pool */}
          <div className="p-3 rounded-2xl bg-slate-900/70 border border-white/5">
            <div className="text-[10px] text-slate-400 font-medium">Discretionary Pool</div>
            <div className="text-sm font-extrabold text-white font-mono mt-1 truncate">
              {formatCurrency(discretionaryPool, currencySymbol)}
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">Salary - Fixed - Buffer</div>
          </div>

          {/* Weekly Cap */}
          <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30">
            <div className="text-[10px] text-emerald-300 font-medium">Weekly Cap</div>
            <div className="text-base font-extrabold text-emerald-400 font-mono mt-0.5 truncate">
              {formatCurrency(weeklyCap, currencySymbol)}
            </div>
            <div className="text-[9px] text-emerald-400/70 mt-0.5">Pool / 4 Weeks</div>
          </div>

          {/* Base Daily Allowance */}
          <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30">
            <div className="text-[10px] text-cyan-300 font-medium">Base Daily Safe</div>
            <div className="text-base font-extrabold text-cyan-400 font-mono mt-0.5 truncate">
              {formatCurrency(baseDailyAllowance, currencySymbol)}
            </div>
            <div className="text-[9px] text-cyan-400/70 mt-0.5">Pool / 28 Days</div>
          </div>
        </div>

        {discretionaryPool <= 0 && netSalary > 0 && (
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-center">
            ⚠️ Warning: Fixed commitments exceed or match salary. Reduce commitments or buffer to create a discretionary pool.
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveBudget}
        className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-98 transition ${
          saveSuccess
            ? 'bg-emerald-400 text-slate-950'
            : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-950/40'
        }`}
      >
        {saveSuccess ? (
          <>
            <Check className="w-5 h-5" />
            <span>Guardrails Activated!</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>Lock In Monthly Guardrails</span>
          </>
        )}
      </button>
    </div>
  );
}
