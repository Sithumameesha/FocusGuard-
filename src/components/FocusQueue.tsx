'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Target, 
  Flame, 
  Trash2, 
  Coffee, 
  AlertCircle,
  Undo2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db, Task } from '@/lib/db';
import { sound } from '@/lib/sound';
import { toDateString } from '@/lib/guardrailEngine';

interface FocusQueueProps {
  tasks: Task[];
  todayStr: string;
}

export function FocusQueue({ tasks, todayStr }: FocusQueueProps) {

  // Split tasks into active queue (TODO + IN_PROGRESS) and finished (DONE)
  const todayTasks = tasks.filter((t) => t.date === todayStr);
  const activeQueue = todayTasks.filter((t) => t.status !== 'DONE');
  const doneToday = todayTasks.filter((t) => t.status === 'DONE');

  const inProgressTask = activeQueue.find((t) => t.status === 'IN_PROGRESS');

  // Input state for new task
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isDoneDrawerOpen, setIsDoneDrawerOpen] = useState(false);

  // Pomodoro Timer State (Default 25 minutes = 1500 seconds)
  const FOCUS_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;
  const [timerSeconds, setTimerSeconds] = useState(FOCUS_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isBreakMode, setIsBreakMode] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Tick the timer
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            setIsTimerRunning(false);
            sound.playPomodoroComplete();

            if (!isBreakMode && inProgressTask?.id) {
              // Increment pomodoro count on task
              const currentCount = inProgressTask.pomodoroCount || 0;
              db.tasks.update(inProgressTask.id, {
                pomodoroCount: currentCount + 1,
              });
            }
            return 0;
          }
          // subtle tick sound every 10 seconds or last 5 seconds
          if (prev <= 5) {
            sound.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, isBreakMode, inProgressTask]);

  // Reset timer when switching active task
  useEffect(() => {
    setIsTimerRunning(false);
    setTimerSeconds(isBreakMode ? BREAK_TIME : FOCUS_TIME);
  }, [inProgressTask?.id, isBreakMode]);

  // Timer controls
  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(isBreakMode ? BREAK_TIME : FOCUS_TIME);
  };

  const switchMode = (breakMode: boolean) => {
    setIsBreakMode(breakMode);
    setIsTimerRunning(false);
    setTimerSeconds(breakMode ? BREAK_TIME : FOCUS_TIME);
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalDuration = isBreakMode ? BREAK_TIME : FOCUS_TIME;
  const progressPercent = Math.max(0, Math.min(100, ((totalDuration - timerSeconds) / totalDuration) * 100));

  // Add Task with Strict "Max 3 Planned Items" Guardrail
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (activeQueue.length >= 3) {
      sound.playWarning();
      alert('Behavioral Guardrail: Maximum 3 active focus tasks allowed per day to stop unstructured overwhelm!');
      return;
    }

    // If there is currently NO in-progress task, the first task can automatically be in progress
    const shouldStartNow = activeQueue.length === 0;

    const newTask: Task = {
      title: newTitle.trim(),
      planningNotes: newNotes.trim() || undefined,
      status: shouldStartNow ? 'IN_PROGRESS' : 'TODO',
      date: todayStr,
      createdAt: Date.now(),
      pomodoroCount: 0,
    };

    await db.tasks.add(newTask);
    setNewTitle('');
    setNewNotes('');
    setIsAdding(false);
    sound.playTick();
  };

  // Enforce Exactly 1 Task in Progress
  const handleSetInProgress = async (task: Task) => {
    if (!task.id) return;

    // First pause/set all other tasks to TODO
    const otherTasks = activeQueue.filter((t) => t.id !== task.id);
    for (const t of otherTasks) {
      if (t.id && t.status === 'IN_PROGRESS') {
        await db.tasks.update(t.id, { status: 'TODO' });
      }
    }

    // Set target task to IN_PROGRESS
    await db.tasks.update(task.id, { status: 'IN_PROGRESS' });
    sound.playTick();
  };

  // Complete Task with Confetti & Sound
  const handleCompleteTask = async (task: Task) => {
    if (!task.id) return;

    // Confetti dopamine blast
    try {
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#10b981', '#06b6d4', '#3b82f6', '#f59e0b'],
      });
    } catch {
      // ignore
    }

    sound.playTaskDone();

    await db.tasks.update(task.id, {
      status: 'DONE',
      completedAt: Date.now(),
    });
    setIsTimerRunning(false);
    setTimerSeconds(FOCUS_TIME);
  };

  // Restore/Undo finished task
  const handleRestoreTask = async (task: Task) => {
    if (!task.id) return;
    if (activeQueue.length >= 3) {
      alert('Cannot restore task: you already have 3 active focus items for today.');
      return;
    }
    await db.tasks.update(task.id, {
      status: 'TODO',
      completedAt: undefined,
    });
    sound.playTick();
  };

  // Delete task
  const handleDeleteTask = async (taskId?: number) => {
    if (!taskId) return;
    await db.tasks.delete(taskId);
  };

  return (
    <div className="space-y-4">
      {/* Habit Discipline Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>Daily Focus Queue</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-white/10 font-mono">
              {activeQueue.length}/3 Planned
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Strict single-focus queue: Max 1 in-progress + max 3 planned.
          </p>
        </div>

        {/* Add button (disabled when 3 tasks reached) */}
        {!isAdding && (
          <button
            onClick={() => {
              if (activeQueue.length >= 3) {
                sound.playWarning();
                alert('Daily focus cap reached (3 tasks). Complete an item before adding another.');
                return;
              }
              setIsAdding(true);
            }}
            disabled={activeQueue.length >= 3}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
              activeQueue.length >= 3
                ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-white/5'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Focus</span>
          </button>
        )}
      </div>

      {/* Add Task Form Drawer */}
      {isAdding && (
        <form onSubmit={handleAddTask} className="p-4 rounded-2xl glass-panel-elevated border border-emerald-500/30 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              New Focus Item ({activeQueue.length + 1} of 3)
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
          </div>

          <input
            type="text"
            required
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What is your singular priority right now?"
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
          />

          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Planning notes or sub-steps (optional)"
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
          />

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition"
          >
            <span>Lock In Task</span>
          </button>
        </form>
      )}

      {/* Empty State Check-in Prompt */}
      {activeQueue.length === 0 && (
        <div className="p-6 rounded-3xl glass-panel text-center border border-dashed border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-emerald-400 mx-auto flex items-center justify-center mb-2.5">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-white">Morning Check-In Ready</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 mb-3">
            Set your top 1 to 3 non-negotiable priorities for today. Execute them one by one without context switching.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Plan Today&apos;s Priorities</span>
          </button>
        </div>
      )}

      {/* 1. Active Task Card with Integrated Pomodoro Timer */}
      {inProgressTask && (
        <div className="rounded-3xl p-5 bg-gradient-to-br from-[#0e1e2d] to-[#0c1824] border-2 border-emerald-500/60 shadow-xl shadow-emerald-950/30 relative overflow-hidden">
          {/* Top Active Bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Flame className="w-3 h-3 text-emerald-400" />
                ACTIVE FOCUS (1 OF 1)
              </span>
            </div>

            {/* Pomodoro count */}
            <span className="text-[11px] font-mono text-emerald-300/80">
              🍅 {inProgressTask.pomodoroCount || 0} Pomodoros
            </span>
          </div>

          {/* Task Title & Notes */}
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-white leading-tight">
              {inProgressTask.title}
            </h3>
            {inProgressTask.planningNotes && (
              <p className="text-xs text-slate-300/90 mt-1.5 bg-black/20 p-2 rounded-xl border border-white/5">
                {inProgressTask.planningNotes}
              </p>
            )}
          </div>

          {/* Integrated 25-min Pomodoro Countdown */}
          <div className="bg-slate-900/80 rounded-2xl p-4 border border-white/10 text-center relative overflow-hidden">
            {/* Mode switch */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => switchMode(false)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                  !isBreakMode
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                25m Focus
              </button>
              <button
                type="button"
                onClick={() => switchMode(true)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition ${
                  isBreakMode
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Coffee className="w-3 h-3" />
                5m Break
              </button>
            </div>

            {/* Timer Digits */}
            <div className="text-4xl font-extrabold font-mono text-white tracking-tight my-1">
              {formatTime(timerSeconds)}
            </div>

            {/* Progress Bar */}
            <div className="w-48 mx-auto h-1.5 rounded-full bg-slate-800 my-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isBreakMode ? 'bg-cyan-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Timer Buttons */}
            <div className="flex items-center justify-center gap-3 mt-2">
              <button
                onClick={toggleTimer}
                className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition ${
                  isTimerRunning
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                }`}
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isTimerRunning ? 'Pause' : 'Start Focus'}</span>
              </button>

              <button
                onClick={resetTimer}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white border border-slate-700 active:scale-95 transition"
                title="Reset Timer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action: Mark as Complete */}
          <div className="mt-4 pt-2 flex items-center gap-2">
            <button
              onClick={() => handleCompleteTask(inProgressTask)}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 active:scale-98 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Done & Celebrate</span>
            </button>

            <button
              onClick={() => handleDeleteTask(inProgressTask.id)}
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-white/5 transition"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Planned / Up Next Tasks (Up to 2 more, strictly enforces single active) */}
      {activeQueue.filter((t) => t.id !== inProgressTask?.id).length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
            Planned Queue (Up Next)
          </div>
          {activeQueue
            .filter((t) => t.id !== inProgressTask?.id)
            .map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-2xl glass-panel border border-white/[0.08] flex items-center justify-between gap-3 hover:border-white/20 transition"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-white truncate">{task.title}</h4>
                  {task.planningNotes && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {task.planningNotes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleSetInProgress(task)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 text-[11px] font-bold border border-white/10 active:scale-95 transition"
                  >
                    Start Focus
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Guardrail Capacity Notice when 3 tasks are queued */}
      {activeQueue.length >= 3 && (
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Queue full (3/3). Focus on finishing these before taking on more.</span>
        </div>
      )}

      {/* 3. "Done Today" Drawer (Collapses finished items) */}
      {doneToday.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setIsDoneDrawerOpen(!isDoneDrawerOpen)}
            className="w-full p-3 rounded-2xl bg-slate-900/70 border border-white/10 flex items-center justify-between text-xs text-slate-300 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">Done Today ({doneToday.length})</span>
            </div>
            {isDoneDrawerOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {isDoneDrawerOpen && (
            <div className="mt-2 space-y-2 pl-2 border-l-2 border-emerald-500/20 animate-in fade-in slide-in-from-top-2 duration-150">
              {doneToday.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-slate-900/40 border border-white/5 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs text-slate-400 line-through truncate">
                      {task.title}
                    </span>
                    {task.pomodoroCount ? (
                      <span className="text-[10px] text-slate-500 font-mono">
                        (🍅 {task.pomodoroCount})
                      </span>
                    ) : null}
                  </div>

                  <button
                    onClick={() => handleRestoreTask(task)}
                    className="p-1 rounded text-slate-500 hover:text-slate-300 transition"
                    title="Restore task to queue"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
