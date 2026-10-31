'use client';

import React from 'react';
import { Volume2, VolumeX, SlidersHorizontal, ShieldCheck, Flame } from 'lucide-react';
import { SprintInfo } from '@/lib/guardrailEngine';

interface HeaderProps {
  sprint: SprintInfo;
  todayFormatted: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  currencySymbol: string;
  hasActiveTask: boolean;
}

export function Header({
  sprint,
  todayFormatted,
  soundEnabled,
  onToggleSound,
  onOpenSettings,
  currencySymbol,
  hasActiveTask,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#070a12]/80 backdrop-blur-xl border-b border-white/[0.06] pt-safe px-4 pb-3 transition-all">
      <div className="flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1px] shadow-lg shadow-emerald-950/40">
            <div className="w-full h-full bg-[#090e1a] rounded-[11px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1">
                FocusGuard
              </h1>
              {hasActiveTask && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  <Flame className="w-2.5 h-2.5" />
                  FLOW
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {todayFormatted} • <span className="text-emerald-400 font-semibold">Sprint {sprint.sprintNumber}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleSound}
            className={`w-8 h-8 rounded-xl flex items-center justify-center border transition active:scale-95 ${
              soundEnabled
                ? 'bg-slate-800/80 border-slate-700 text-emerald-400 hover:border-emerald-500/40'
                : 'bg-slate-900/60 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? 'Mute synthesized sound effects' : 'Enable sound effects'}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenSettings}
            className="h-8 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 flex items-center gap-1.5 text-slate-300 hover:text-white transition active:scale-95"
            title="Settings and Data management"
            aria-label="Settings"
          >
            <span className="text-xs font-mono font-semibold text-emerald-400">{currencySymbol}</span>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
