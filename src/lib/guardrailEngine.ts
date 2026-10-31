import { MonthlyBudget, Expense } from './db';

export interface SprintInfo {
  sprintNumber: number; // 1, 2, 3, or 4
  startDay: number;
  endDay: number;
  totalDays: number;
  currentDayIndex: number;
  remainingDays: number; // including today
  startDateStr: string; // "YYYY-MM-DD"
  endDateStr: string;   // "YYYY-MM-DD"
}

export interface SpendAnalysis {
  discretionaryPool: number;
  weeklyCap: number;
  baseDailyAllowance: number;
  totalFixedPaid: number;
  totalFixedUnpaid: number;
  totalFixedCommitments: number;
  
  sprint: SprintInfo;
  
  totalSpentInSprint: number;
  remainingWeeklyBudget: number;
  dailySafeSpend: number;
  spentToday: number;
  remainingToday: number;
  
  // Tomorrow projection if overspent
  projectedTomorrowAllowance: number;
  tomorrowShrinkAmount: number;
  
  // Status flags
  isWeeklyLimitReached: boolean;
  isOverDailySpend: boolean;
  isOnTrack: boolean;
  
  // Percentages for visual progress bars
  weeklySpendPercent: number;
  dailySpendPercent: number;
}

/**
 * Calculates days in a specific month
 */
export function getDaysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, symbol = '$'): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = absVal.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

/**
 * Pads a number with leading zero
 */
function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Formats a Date object to "YYYY-MM-DD"
 */
export function toDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  return `${y}-${m}-${day}`;
}

/**
 * Formats a Date object to "YYYY-MM"
 */
export function toMonthString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = padZero(d.getMonth() + 1);
  return `${y}-${m}`;
}

/**
 * Computes the 7-day sprint block for a given date
 */
export function getSprintInfo(targetDate: Date = new Date()): SprintInfo {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth(); // 0-indexed
  const day = targetDate.getDate();
  const totalDaysInMonth = getDaysInMonth(year, month);

  let sprintNumber = 1;
  let startDay = 1;
  let endDay = 7;

  if (day <= 7) {
    sprintNumber = 1;
    startDay = 1;
    endDay = 7;
  } else if (day <= 14) {
    sprintNumber = 2;
    startDay = 8;
    endDay = 14;
  } else if (day <= 21) {
    sprintNumber = 3;
    startDay = 15;
    endDay = 21;
  } else {
    sprintNumber = 4;
    startDay = 22;
    endDay = totalDaysInMonth; // covers days 22 to 28/29/30/31
  }

  const totalDays = endDay - startDay + 1;
  const currentDayIndex = day - startDay + 1;
  const remainingDays = Math.max(1, endDay - day + 1);

  const monthStr = padZero(month + 1);
  const startDateStr = `${year}-${monthStr}-${padZero(startDay)}`;
  const endDateStr = `${year}-${monthStr}-${padZero(endDay)}`;

  return {
    sprintNumber,
    startDay,
    endDay,
    totalDays,
    currentDayIndex,
    remainingDays,
    startDateStr,
    endDateStr,
  };
}

/**
 * Core Dynamic Spend & Guardrail Calculation Engine
 */
export function calculateGuardrails(
  budget: MonthlyBudget | undefined,
  expenses: Expense[],
  currentDate: Date = new Date()
): SpendAnalysis {
  const sprint = getSprintInfo(currentDate);
  const todayStr = toDateString(currentDate);

  // If no budget setup yet, return safe zeroed analysis
  if (!budget) {
    return {
      discretionaryPool: 0,
      weeklyCap: 0,
      baseDailyAllowance: 0,
      totalFixedPaid: 0,
      totalFixedUnpaid: 0,
      totalFixedCommitments: 0,
      sprint,
      totalSpentInSprint: 0,
      remainingWeeklyBudget: 0,
      dailySafeSpend: 0,
      spentToday: 0,
      remainingToday: 0,
      projectedTomorrowAllowance: 0,
      tomorrowShrinkAmount: 0,
      isWeeklyLimitReached: false,
      isOverDailySpend: false,
      isOnTrack: true,
      weeklySpendPercent: 0,
      dailySpendPercent: 0,
    };
  }

  // 1. Monthly Budget Calculations
  const totalFixedCommitments = budget.fixedExpenses.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  const totalFixedPaid = budget.fixedExpenses
    .filter((item) => item.isPaid)
    .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalFixedUnpaid = totalFixedCommitments - totalFixedPaid;

  const netSalary = Number(budget.netSalary) || 0;
  const emergencyBuffer = Number(budget.emergencyBuffer) || 0;

  const discretionaryPool = Math.max(0, netSalary - totalFixedCommitments - emergencyBuffer);
  const weeklyCap = discretionaryPool / 4;
  const baseDailyAllowance = discretionaryPool / 28;

  // 2. Sprint Expenses Calculations
  // Filter expenses falling inside the current sprint block
  const sprintExpenses = expenses.filter(
    (e) => e.date >= sprint.startDateStr && e.date <= sprint.endDateStr
  );
  const totalSpentInSprint = sprintExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // 3. Dynamic Daily Safe Spend Engine
  // Remaining Weekly Budget = Weekly Cap - Total Spent in Current Sprint
  const remainingWeeklyBudget = weeklyCap - totalSpentInSprint;

  // Daily Safe Spend = Remaining Weekly Budget / Remaining Days in Current Sprint
  let dailySafeSpend = 0;
  if (remainingWeeklyBudget > 0 && sprint.remainingDays > 0) {
    dailySafeSpend = remainingWeeklyBudget / sprint.remainingDays;
  }

  // Spent Today
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const spentToday = todayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Remaining Today = Daily Safe Spend - Spent Today
  const remainingToday = dailySafeSpend - spentToday;

  // Visual & Behavioral States
  const isWeeklyLimitReached = remainingWeeklyBudget <= 0;
  const isOverDailySpend = remainingToday < 0 && !isWeeklyLimitReached;
  const isOnTrack = remainingToday >= 0 && !isWeeklyLimitReached;

  // 4. Dynamic Penalty Projection:
  // If overspent today, calculate how tomorrow's allowance will shrink
  let projectedTomorrowAllowance = 0;
  let tomorrowShrinkAmount = 0;

  if (isOverDailySpend && sprint.remainingDays > 1) {
    // Remaining budget after today's expenses
    const budgetAfterToday = remainingWeeklyBudget - spentToday;
    const daysAfterToday = sprint.remainingDays - 1;
    projectedTomorrowAllowance = Math.max(0, budgetAfterToday / daysAfterToday);
    tomorrowShrinkAmount = Math.max(0, dailySafeSpend - projectedTomorrowAllowance);
  } else if (!isWeeklyLimitReached && sprint.remainingDays > 1) {
    // If on track, tomorrow's safe spend will adjust depending on today's remaining
    const budgetAfterToday = remainingWeeklyBudget - spentToday;
    const daysAfterToday = sprint.remainingDays - 1;
    projectedTomorrowAllowance = Math.max(0, budgetAfterToday / daysAfterToday);
  }

  // Spend Percentages
  const weeklySpendPercent = weeklyCap > 0 ? Math.min(100, Math.round((totalSpentInSprint / weeklyCap) * 100)) : 0;
  const dailySpendPercent = dailySafeSpend > 0 ? Math.min(200, Math.round((spentToday / dailySafeSpend) * 100)) : 0;

  return {
    discretionaryPool,
    weeklyCap,
    baseDailyAllowance,
    totalFixedPaid,
    totalFixedUnpaid,
    totalFixedCommitments,
    sprint,
    totalSpentInSprint,
    remainingWeeklyBudget,
    dailySafeSpend,
    spentToday,
    remainingToday,
    projectedTomorrowAllowance,
    tomorrowShrinkAmount,
    isWeeklyLimitReached,
    isOverDailySpend,
    isOnTrack,
    weeklySpendPercent,
    dailySpendPercent,
  };
}

/**
 * Default fixed commitments starter template
 */
export const DEFAULT_FIXED_EXPENSES = [
  { id: 'rent', title: 'Rent / Mortgage', amount: 1200, isPaid: false },
  { id: 'bike', title: 'Bike Finance / Lease', amount: 280, isPaid: false },
  { id: 'loan', title: 'Bank Loans', amount: 350, isPaid: false },
  { id: 'elec', title: 'Electricity Baseline', amount: 90, isPaid: false },
  { id: 'water', title: 'Water Baseline', amount: 45, isPaid: false },
  { id: 'net', title: 'High-speed Internet', amount: 65, isPaid: false },
];
