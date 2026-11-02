'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Key, 
  X, 
  ExternalLink,
  RotateCcw,
  Smile
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db, MonthlyBudget } from '@/lib/db';
import { sound } from '@/lib/sound';
import { SpendAnalysis, formatCurrency, toMonthString } from '@/lib/guardrailEngine';
import { 
  AdvisorMessage, 
  generateAdvisorResponse, 
  evaluateFinancialHealth 
} from '@/lib/aiAdvisorEngine';

interface AiSalaryAdvisorProps {
  currentBudget: MonthlyBudget | undefined;
  analysis: SpendAnalysis;
  currencySymbol: string;
  onNavigateToGuardrails: () => void;
  onNavigateToSalary: () => void;
}

export function AiSalaryAdvisor({
  currentBudget,
  analysis,
  currencySymbol,
  onNavigateToGuardrails,
  onNavigateToSalary,
}: AiSalaryAdvisorProps) {
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [appliedPlanId, setAppliedPlanId] = useState<string | null>(null);
  
  // Gemini API Key State
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [useGemini, setUseGemini] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [saveKeySuccess, setSaveKeySuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Gemini API Key from IndexedDB settings
  useEffect(() => {
    db.settings.get('gemini_api_key').then((res) => {
      if (res?.value) {
        setGeminiApiKey(res.value);
        setKeyInput(res.value);
        setUseGemini(true);
      }
    });
  }, []);

  // Initialize with friendly greeting
  useEffect(() => {
    const initialGreeting: AdvisorMessage = {
      id: 'init_welcome',
      sender: 'assistant',
      text: `### 👋 Hey there! I'm your FocusGuard AI Companion\n\nI'm powered by Google Gemini and trained on behavioral focus and financial guardrails. We can chat about **anything** you'd like:\n\n- 💬 **Friendly Casual Chat:** How your day is going, stress relief, work-life balance, or casual conversation.\n- ⚡ **Daily Focus Motivation:** Tips to conquer procrastination and stick to your 25m Pomodoro sprint.\n- 🛡️ **Salary Guardrails:** How to budget any salary (like 10,000) so you never get stuck mid-month.\n\nWhat's on your mind today?`,
      timestamp: Date.now(),
    };
    setMessages([initialGreeting]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const health = evaluateFinancialHealth(currentBudget, analysis);

  // Clear Chat history
  const handleClearChat = () => {
    setMessages([
      {
        id: `clear_${Date.now()}`,
        sender: 'assistant',
        text: `Fresh chat started! 🌱 What would you like to chat about? Casual talk, focus hacks, or salary guardrails?`,
        timestamp: Date.now(),
      },
    ]);
    sound.playTick();
  };

  // Save Gemini Key
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyInput.trim();
    setGeminiApiKey(trimmed);
    setUseGemini(Boolean(trimmed));
    await db.settings.put({ key: 'gemini_api_key', value: trimmed });
    sound.playExpenseLogged();
    setSaveKeySuccess(true);
    setTimeout(() => {
      setSaveKeySuccess(false);
      setIsKeyModalOpen(false);
    }, 1000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: AdvisorMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputText('');
    setIsTyping(true);
    sound.playTick();

    // 1. Try Google Gemini API if enabled (with multi-turn history memory!)
    if (useGemini && (geminiApiKey || process.env.NEXT_PUBLIC_GEMINI_KEY)) {
      try {
        // Build history turns from previous messages (excluding the new prompt)
        const historyForGemini = messages.slice(-10).map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          text: m.text,
        }));

        const response = await fetch('/api/gemini-advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            apiKey: geminiApiKey,
            history: historyForGemini,
            context: {
              netSalary: currentBudget?.netSalary || 0,
              totalFixed: analysis.totalFixedCommitments,
              discretionaryPool: analysis.discretionaryPool,
              weeklyCap: analysis.weeklyCap,
              dailySafeSpend: analysis.dailySafeSpend,
              spentToday: analysis.spentToday,
              remainingToday: analysis.remainingToday,
              isWeeklyLimitReached: analysis.isWeeklyLimitReached,
              isOverDailySpend: analysis.isOverDailySpend,
              currencySymbol,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const geminiMsg: AdvisorMessage = {
            id: `msg_gemini_${Date.now()}`,
            sender: 'assistant',
            text: data.text,
            timestamp: Date.now(),
            recommendedPlan: data.recommendedPlan || undefined,
          };
          setMessages((prev) => [...prev, geminiMsg]);
          setIsTyping(false);
          sound.playExpenseLogged();
          return;
        } else {
          const errData = await response.json().catch(() => ({}));
          console.warn('Gemini API returned error, falling back to local advisor:', errData);
        }
      } catch (err) {
        console.warn('Network error reaching Gemini API, falling back to local engine:', err);
      }
    }

    // 2. High-speed local financial reasoning fallback
    setTimeout(() => {
      const response = generateAdvisorResponse(text, currentBudget, analysis, currencySymbol);
      setMessages((prev) => [...prev, response]);
      setIsTyping(false);
      sound.playExpenseLogged();
    }, 500);
  };

  // 1-Click Apply Plan to Dexie IndexedDB
  const handleApplyPlan = async (plan: NonNullable<AdvisorMessage['recommendedPlan']>, msgId: string) => {
    try {
      const currentMonthStr = toMonthString(new Date());
      const updatedBudget: MonthlyBudget = {
        id: currentBudget?.id || currentMonthStr,
        netSalary: plan.salary,
        fixedExpenses: plan.fixedExpenses,
        emergencyBuffer: plan.emergencyBuffer,
        createdAt: Date.now(),
      };

      await db.monthlyBudgets.put(updatedBudget);

      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#38bdf8', '#fbbf24'],
        });
      } catch {
        // ignore
      }

      sound.playTaskDone();
      setAppliedPlanId(msgId);
    } catch (err) {
      console.error('Failed to apply plan:', err);
    }
  };

  const QUICK_PROMPTS = [
    { label: '👋 Friendly Chat', query: 'Hey Gemini! How are you doing today?' },
    { label: '⚡ Focus Motivation', query: 'I am feeling distracted and tired today. How can I regain my focus?' },
    { label: '💡 Plan 10,000 Salary', query: 'I earn 10,000. How should I plan my salary so I never get stuck?' },
    { label: '😂 Tell Me a Joke', query: 'Tell me a funny lighthearted joke to brighten my work session!' },
    { label: '🚨 Fixed Debt Too High', query: 'My fixed loans and rent are taking over 60% of my salary. Help me triage.' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-3">
      {/* Advisor Header & Health Status */}
      <div className="p-3.5 rounded-3xl glass-panel-elevated border border-emerald-500/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-[1px] shadow-lg shadow-emerald-950/40">
            <div className="w-full h-full bg-[#080e1a] rounded-[15px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold text-white flex items-center gap-1">
                Gemini AI Companion
              </h2>
              {useGemini && geminiApiKey ? (
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                  Gemini Live
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  Offline Core
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Friendly chat, focus coach & salary advisor
            </p>
          </div>
        </div>

        {/* Action Controls: Clear Chat, Gemini Key & Financial Health */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-xl bg-slate-800 border border-white/10 text-slate-400 hover:text-white transition active:scale-95"
            title="Start fresh conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsKeyModalOpen(true)}
            className={`p-1.5 rounded-xl border text-[10px] flex items-center gap-1 transition ${
              geminiApiKey 
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' 
                : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Connect Google Gemini API Key"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{geminiApiKey ? 'Gemini Key' : 'API Key'}</span>
          </button>

          <div className={`px-2 py-1 rounded-xl text-[10px] font-bold border ${health.color} flex items-center gap-1`}>
            <ShieldCheck className="w-3 h-3" />
            <span>{health.ratioFixedPercent}%</span>
          </div>
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 pr-0.5">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-150`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-md ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'glass-panel border border-white/10 text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Render Text with Markdown Highlights */}
                <div className="space-y-1.5">
                  {msg.text.split('\n\n').map((para, idx) => {
                    if (para.startsWith('### ')) {
                      return (
                        <h4 key={idx} className="font-bold text-sm text-emerald-300 mt-1 mb-1">
                          {para.replace('### ', '')}
                        </h4>
                      );
                    }
                    if (para.startsWith('- ') || para.startsWith('1. ') || para.startsWith('2. ') || para.startsWith('3. ')) {
                      return (
                        <div key={idx} className="pl-1 text-slate-300 leading-normal">
                          {para.split('\n').map((line, lIdx) => (
                            <div key={lIdx} className="my-0.5">
                              {line}
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return <p key={idx}>{para}</p>;
                  })}
                </div>

                {/* Plan Recommendation Card (if present) */}
                {msg.recommendedPlan && (
                  <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-br from-[#0c1828] to-[#08121f] border border-emerald-500/40 text-left shadow-lg">
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {msg.recommendedPlan.strategyName}
                      </span>
                      <span className="text-xs font-mono font-bold text-white">
                        {formatCurrency(msg.recommendedPlan.salary, currencySymbol)}
                      </span>
                    </div>

                    {/* Numbers Grid */}
                    <div className="grid grid-cols-3 gap-1.5 text-center my-2">
                      <div className="p-2 rounded-xl bg-slate-900/80 border border-white/5">
                        <span className="text-[9px] text-slate-400 block">Discretionary</span>
                        <span className="text-xs font-bold font-mono text-white">
                          {formatCurrency(msg.recommendedPlan.discretionaryPool, currencySymbol)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                        <span className="text-[9px] text-emerald-300 block">Weekly Cap</span>
                        <span className="text-xs font-bold font-mono text-emerald-400">
                          {formatCurrency(msg.recommendedPlan.weeklyCap, currencySymbol)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                        <span className="text-[9px] text-cyan-300 block">Safe Daily</span>
                        <span className="text-xs font-bold font-mono text-cyan-400">
                          {formatCurrency(msg.recommendedPlan.dailyAllowance, currencySymbol)}
                        </span>
                      </div>
                    </div>

                    {/* Fixed vs Buffer Summary */}
                    <div className="text-[10px] text-slate-400 flex items-center justify-between px-1 my-1">
                      <span>Fixed: {formatCurrency(msg.recommendedPlan.salary - msg.recommendedPlan.discretionaryPool - msg.recommendedPlan.emergencyBuffer, currencySymbol)}</span>
                      <span>Buffer: {formatCurrency(msg.recommendedPlan.emergencyBuffer, currencySymbol)}</span>
                    </div>

                    {/* Apply Plan CTA */}
                    <div className="mt-2.5 pt-1.5 border-t border-white/10 flex items-center gap-2">
                      {appliedPlanId === msg.id ? (
                        <div className="w-full py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-center font-bold text-[11px] flex items-center justify-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Guardrails Applied to Live Budget!</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleApplyPlan(msg.recommendedPlan!, msg.id)}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 hover:from-emerald-400 hover:to-teal-400 active:scale-95 transition shadow-md shadow-emerald-950/50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Apply Plan to My Guardrails</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-500 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-1.5 p-3 rounded-2xl glass-panel w-20 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 shrink-0">
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(qp.query)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-emerald-500/30 text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition active:scale-95 shrink-0 flex items-center gap-1"
          >
            <Smile className="w-3 h-3 text-cyan-400" />
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 p-1.5 rounded-2xl glass-panel-elevated border border-white/10 focus-within:border-emerald-500/50 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Chat freely e.g. 'Hey, how can I stay focused today?' or 'Plan 10,000 salary'"
          className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95 shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Gemini API Key Configuration Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full sm:max-w-md bg-[#0d1322] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 pb-safe text-slate-100 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Google Gemini AI Setup</h3>
                  <p className="text-[10px] text-slate-400">Live chat & conversational reasoning</p>
                </div>
              </div>
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveApiKey} className="mt-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Google AI Studio API Key
                </label>
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-200/90 leading-relaxed">
                <p>
                  Google Gemini API is <strong>100% free</strong> with generous rate limits for personal use.
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-bold mt-1.5"
                >
                  <span>Get your free API key at Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Current Engine:</span>
                <span className="font-bold text-emerald-400">
                  {keyInput ? 'Google Gemini 1.5 Flash' : 'Built-in Offline Intelligence'}
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
              >
                {saveKeySuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Gemini API Key Saved!</span>
                  </>
                ) : (
                  <span>Save API Key</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
