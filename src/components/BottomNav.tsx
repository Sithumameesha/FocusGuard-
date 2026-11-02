'use client';

import React from 'react';
import { Shield, Target, CalendarDays, History, Bot } from 'lucide-react';

export type ActiveTab = 'guardrails' | 'focus' | 'advisor' | 'salary' | 'history';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  focusBadgeCount?: number;
  hasFreezeAlert?: boolean;
}

export function BottomNav({
  activeTab,
  onChangeTab,
  focusBadgeCount = 0,
  hasFreezeAlert = false,
}: BottomNavProps) {
  const tabs = [
    {
      id: 'guardrails' as ActiveTab,
      label: 'Guardrail',
      icon: Shield,
      alert: hasFreezeAlert,
    },
    {
      id: 'focus' as ActiveTab,
      label: 'Focus Flow',
      icon: Target,
      badge: focusBadgeCount > 0 ? focusBadgeCount : undefined,
    },
    {
      id: 'advisor' as ActiveTab,
      label: 'AI Advisor',
      icon: Bot,
      isAi: true,
    },
    {
      id: 'salary' as ActiveTab,
      label: 'Salary Setup',
      icon: CalendarDays,
    },
    {
      id: 'history' as ActiveTab,
      label: 'Activity',
      icon: History,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#090d18]/90 backdrop-blur-2xl border-t border-white/[0.08] pb-safe px-2 pt-2">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition active:scale-95 ${
                isActive
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-emerald-400 stroke-[2.3]' : 'stroke-[1.7]'
                  } ${tab.isAi && !isActive ? 'text-cyan-400' : ''}`}
                />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-3.5 px-0.5 rounded-full bg-emerald-500 text-[9px] font-bold text-slate-950 flex items-center justify-center shadow-md">
                    {tab.badge}
                  </span>
                )}
                {tab.alert && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#090d18] animate-ping" />
                )}
                {tab.isAi && (
                  <span className="absolute -top-1 -right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
              </div>
              <span className={`text-[9px] mt-1 tracking-tight truncate ${tab.isAi && !isActive ? 'text-cyan-300/80 font-medium' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="w-4 h-0.5 rounded-full bg-emerald-400 mt-0.5 shadow-sm shadow-emerald-400/50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
