'use client';

import React from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  PlusCircle, 
  TrendingDown, 
  Calendar,
  Lock,
  ArrowRight
} from 'lucide-react';
import { SpendAnalysis, formatCurrency } from '@/lib/guardrailEngine';

interface DailySpendCardProps {
  analysis: SpendAnalysis;
  currencySymbol: string;
  onOpenLogModal: () => void;
  onOpenSalarySetup: () => void;
  hasBudget: boolean;
}

export function DailySpendCard({
  analysis,
  currencySymbol,
  onOpenLogModal,
  onOpenSalarySetup,
  hasBudget,
}: DailySpendCardProps) {
  if (!hasBudget) {
    return (
      <div className="glass-panel-elevated rounded-3xl p-6 text-center border border-emerald-500/30 relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center mb-3 border border-emerald-500/20">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Set Up Monthly Guardrails</h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4 leading-relaxed">
          Input your net salary and fixed non-negotiables to calculate strict weekly caps and dynamic daily safe spend.
        </p>
        <button
          onClick={onOpenSalarySetup}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/40 hover:from-emerald-400 hover:to-teal-400 active:scale-95 transition"
        >
          <span>Begin Day 1 Setup</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const {
    sprint,
    dailySafeSpend,
    spentToday,
    remainingToday,
    weeklyCap,
    totalSpentInSprint,
    remainingWeeklyBudget,
    isWeeklyLimitReached,
    isOverDailySpend,
    isOnTrack,
    projectedTomorrowAllowance,
    tomorrowShrinkAmount,
    weeklySpendPercent,
    dailySpendPercent,
  } = analysis;

  return (
    <div className={`rounded-3xl p-5 border transition-all duration-300 relative overflow-hidden ${
      isWeeklyLimitReached
        ? 'bg-rose-950/30 border-rose-500/40 glow-red'
        : isOverDailySpend
        ? 'bg-amber-950/25 border-amber-500/40 glow-warning'
        : 'glass-panel-elevated border-emerald-500/30 glow-green'
    }`}>
      {/* Background radial gradient */}
      <div className={`absolute -right-16 -top-16 w-44 h-44 rounded-full blur-3xl pointer-events-none ${
        isWeeklyLimitReached
          ? 'bg-rose-600/15'
          : isOverDailySpend
          ? 'bg-amber-600/15'
          : 'bg-emerald-500/15'
      }`} />

      {/* Top Meta: Sprint Badge & Safe Spend Indicator */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/[0.07] border border-white/10 text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-emerald-400" />
            Sprint {sprint.sprintNumber} • Day {sprint.currentDayIndex}/{sprint.totalDays}
          </span>
          <span className="text-[11px] text-slate-400">
            {sprint.remainingDays} {sprint.remainingDays === 1 ? 'day' : 'days'} left
          </span>
        </div>

        {/* State Badge */}
        {isWeeklyLimitReached ? (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            WEEKLY LIMIT REACHED
          </span>
        ) : isOverDailySpend ? (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            OVER DAILY SAFE SPEND
          </span>
        ) : (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            ON TRACK
          </span>
        )}
      </div>

      {/* Hero Display: Remaining Today */}
      <div className="my-2">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
          {isWeeklyLimitReached
            ? 'Spend Frozen for Current Sprint'
            : isOverDailySpend
            ? 'Overspent Today'
            : 'Safe to Spend Today'}
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={`text-4xl font-extrabold font-mono tracking-tight ${
            isWeeklyLimitReached
              ? 'text-rose-400'
              : isOverDailySpend
              ? 'text-amber-400'
              : 'text-emerald-400'
          }`}>
            {formatCurrency(Math.abs(remainingToday), currencySymbol)}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {isOverDailySpend ? 'over limit' : `left of ${formatCurrency(dailySafeSpend, currencySymbol)}`}
          </span>
        </div>
      </div>

      {/* Dynamic Behavioral Feedback / Compensation Warning */}
      {isWeeklyLimitReached && (
        <div className="mt-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <span className="font-bold block text-rose-300">Discretionary Freeze Active</span>
            You have spent {formatCurrency(totalSpentInSprint, currencySymbol)} out of your {formatCurrency(weeklyCap, currencySymbol)} weekly cap. Discretionary spending is frozen for the remaining {sprint.remainingDays} days of Sprint {sprint.sprintNumber} to stop mid-month drain.
          </div>
        </div>
      )}

      {isOverDailySpend && !isWeeklyLimitReached && (
        <div className="mt-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
          <TrendingDown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <span className="font-bold block text-amber-300">Automated Compensation Alert</span>
            You exceeded today&apos;s safe spend by {formatCurrency(Math.abs(remainingToday), currencySymbol)}.
            {sprint.remainingDays > 1 ? (
              <> Tomorrow&apos;s allowance will shrink from <span className="font-mono font-semibold">{formatCurrency(dailySafeSpend, currencySymbol)}</span> to <span className="font-mono font-bold text-amber-300">{formatCurrency(projectedTomorrowAllowance, currencySymbol)}</span> (-{formatCurrency(tomorrowShrinkAmount, currencySymbol)}) to keep your weekly cap intact.</>
            ) : (
              <> Today is the final day of this sprint. Any excess cuts into your emergency buffer.</>
            )}
          </div>
        </div>
      )}

      {isOnTrack && (
        <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Spent today: <span className="text-slate-200 font-mono font-medium">{formatCurrency(spentToday, currencySymbol)}</span></span>
          <span>Daily Safe Base: <span className="text-slate-200 font-mono font-medium">{formatCurrency(dailySafeSpend, currencySymbol)}</span></span>
        </div>
      )}

      {/* Spend Progress Bars */}
      <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-2.5">
        {/* Daily Progress */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Today&apos;s Spend Meter</span>
            <span className="font-mono">{dailySpendPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isWeeklyLimitReached
                  ? 'bg-rose-500'
                  : isOverDailySpend
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${Math.min(100, dailySpendPercent)}%` }}
            />
          </div>
        </div>

        {/* Weekly Cap Progress */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Weekly Sprint Cap ({formatCurrency(totalSpentInSprint, currencySymbol)} / {formatCurrency(weeklyCap, currencySymbol)})</span>
            <span className="font-mono text-slate-300">{formatCurrency(remainingWeeklyBudget, currencySymbol)} left</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isWeeklyLimitReached ? 'bg-rose-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, weeklySpendPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Action Button: Log Expense */}
      <div className="mt-4 pt-2">
        <button
          onClick={onOpenLogModal}
          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-800/90 hover:bg-slate-700/90 border border-white/10 hover:border-emerald-500/40 text-white flex items-center justify-center gap-2 shadow-sm active:scale-98 transition"
        >
          <PlusCircle className="w-4 h-4 text-emerald-400" />
          <span>Log Expense</span>
        </button>
      </div>
    </div>
  );
}
