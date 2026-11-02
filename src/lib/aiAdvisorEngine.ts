import { MonthlyBudget } from './db';
import { formatCurrency, SpendAnalysis } from './guardrailEngine';

export interface AdvisorMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: number;
  recommendedPlan?: {
    salary: number;
    fixedExpenses: { id: string; title: string; amount: number; isPaid: boolean }[];
    emergencyBuffer: number;
    discretionaryPool: number;
    weeklyCap: number;
    dailyAllowance: number;
    strategyName: string;
  };
}

export interface FinancialHealthScore {
  ratioFixedPercent: number; // e.g. 55%
  status: 'OPTIMAL' | 'MODERATE' | 'STRESSED' | 'CRITICAL';
  statusLabel: string;
  color: string;
  burnRatePerDay: number;
  sprintBreathingRoom: number;
}

/**
 * Evaluates current financial health based on live data
 */
export function evaluateFinancialHealth(
  budget: MonthlyBudget | undefined,
  analysis: SpendAnalysis
): FinancialHealthScore {
  if (!budget || budget.netSalary <= 0) {
    return {
      ratioFixedPercent: 0,
      status: 'MODERATE',
      statusLabel: 'Setup Needed',
      color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
      burnRatePerDay: 0,
      sprintBreathingRoom: 0,
    };
  }

  const netSalary = budget.netSalary;
  const fixedTotal = budget.fixedExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const ratio = Math.round((fixedTotal / netSalary) * 100);

  if (ratio > 75) {
    return {
      ratioFixedPercent: ratio,
      status: 'CRITICAL',
      statusLabel: 'Severe Debt / Fixed Drain (>75%)',
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      burnRatePerDay: analysis.spentToday,
      sprintBreathingRoom: analysis.remainingWeeklyBudget,
    };
  } else if (ratio > 60) {
    return {
      ratioFixedPercent: ratio,
      status: 'STRESSED',
      statusLabel: 'High Fixed Load (60-75%)',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      burnRatePerDay: analysis.spentToday,
      sprintBreathingRoom: analysis.remainingWeeklyBudget,
    };
  } else if (ratio > 45) {
    return {
      ratioFixedPercent: ratio,
      status: 'MODERATE',
      statusLabel: 'Balanced Guardrail (45-60%)',
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      burnRatePerDay: analysis.spentToday,
      sprintBreathingRoom: analysis.remainingWeeklyBudget,
    };
  }

  return {
    ratioFixedPercent: ratio,
    status: 'OPTIMAL',
    statusLabel: 'Optimal Headroom (<45%)',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    burnRatePerDay: analysis.spentToday,
    sprintBreathingRoom: analysis.remainingWeeklyBudget,
  };
}

/**
 * Generates an automated strategic plan for a specific salary (e.g. 10,000)
 */
export function generateSalaryBlueprint(
  salary: number,
  currencySymbol = '$',
  preference: 'BALANCED' | 'DEBT_DEFENSE' | 'BUFFER_MAX' = 'BALANCED'
) {
  let fixedPercent = 0.50;
  let bufferPercent = 0.10;
  let strategyName = 'Balanced Guardrail Framework';

  if (preference === 'DEBT_DEFENSE') {
    fixedPercent = 0.65;
    bufferPercent = 0.05;
    strategyName = 'High-Commitment / Debt Survival Plan';
  } else if (preference === 'BUFFER_MAX') {
    fixedPercent = 0.45;
    bufferPercent = 0.15;
    strategyName = 'Wealth Accelerator & Buffer Shield';
  }

  // Calculate allocations
  const emergencyBuffer = Math.round(salary * bufferPercent);
  const totalFixed = Math.round(salary * fixedPercent);
  const discretionaryPool = Math.max(0, salary - totalFixed - emergencyBuffer);
  const weeklyCap = Math.round((discretionaryPool / 4) * 100) / 100;
  const dailyAllowance = Math.round((discretionaryPool / 28) * 100) / 100;

  // Breakdown fixed non-negotiables proportionally
  const fixedExpenses = [
    {
      id: 'plan_rent',
      title: 'Housing / Rent / Mortgage (30%)',
      amount: Math.round(salary * 0.30),
      isPaid: false,
    },
    {
      id: 'plan_loans',
      title: 'Vehicle / Bike / Bank Loans (15%)',
      amount: Math.round(salary * 0.15),
      isPaid: false,
    },
    {
      id: 'plan_utilities',
      title: 'Utilities & Connectivity Baseline (5%)',
      amount: Math.max(100, Math.round(salary * 0.05)),
      isPaid: false,
    },
  ];

  return {
    salary,
    fixedExpenses,
    emergencyBuffer,
    discretionaryPool,
    weeklyCap,
    dailyAllowance,
    strategyName,
    summary: `For a ${formatCurrency(salary, currencySymbol)} salary, we cap fixed non-negotiables at ${formatCurrency(totalFixed, currencySymbol)} (${Math.round(fixedPercent * 100)}%), reserve an emergency buffer of ${formatCurrency(emergencyBuffer, currencySymbol)} (${Math.round(bufferPercent * 100)}%), leaving a Discretionary Pool of ${formatCurrency(discretionaryPool, currencySymbol)}.\n\nDivided into 4 sprints: ${formatCurrency(weeklyCap, currencySymbol)} per week, giving you a daily safe spend of ${formatCurrency(dailyAllowance, currencySymbol)} without ever getting stuck.`,
  };
}

/**
 * Intelligent Financial & Friendly Advisor Response Generator
 * Provides immediate, deterministic, domain-expert responses when offline
 */
export function generateAdvisorResponse(
  userPrompt: string,
  currentBudget: MonthlyBudget | undefined,
  analysis: SpendAnalysis,
  currencySymbol = '$'
): AdvisorMessage {
  const prompt = userPrompt.toLowerCase().trim();
  const id = `msg_${Date.now()}`;

  // 1. Friendly Greetings
  if (/^(hi|hello|hey|yo|howdy|good morning|good evening|good afternoon|what's up|sup)\b/i.test(prompt)) {
    return {
      id,
      sender: 'assistant',
      text: `Hey there! 👋 It's great to chat with you.\n\nI'm your FocusGuard companion—we can chat about your day, productivity hacks, work motivation, or dive into your salary guardrails whenever you feel like it.\n\nHow are you feeling today?`,
      timestamp: Date.now(),
    };
  }

  // 2. Emotional, Frustrated, or Overwhelmed Support (Includes typos: frisuted, felling, tierd, etc.)
  const isEmotionalOrFrustrated =
    /frustrat|frisut|frust|angry|mad|upset|sad|depress|crying|anxious|anxiety|stress|overwhelm|burnt|burnout|exhaust|tired|tierd|felling|feeling bad|feeling down|rough day|tough day|bad day|hate this|can't do this|struggl|unhappy|hopeless|lonely/i.test(
      prompt
    );

  if (isEmotionalOrFrustrated) {
    return {
      id,
      sender: 'assistant',
      text: `I hear you, and it's completely okay to feel frustrated or overwhelmed right now. 🌿\n\nWhen we're under stress, our brain tries to juggle everything at once, making even simple things feel exhausting.\n\nLet's take a slow, deep breath together. 🤍 Here is a gentle reset for right now:\n1. **Step back for 3 minutes:** Grab a glass of water, step away from screens, or look out a window.\n2. **Lower the pressure:** You do NOT have to conquer the whole world today. What is ONE small task in your Focus Flow you can do, or should today be a recovery day?\n3. **I'm listening:** Is work, money, or just an exhausting day getting to you? Feel free to vent—I'm right here with you!`,
      timestamp: Date.now(),
    };
  }

  // 3. How are you / Politeness
  if (prompt.includes('how are you') || prompt.includes('how you doing') || prompt.includes('how r u')) {
    return {
      id,
      sender: 'assistant',
      text: `I'm doing wonderful, thanks for asking! 😊 Energized and ready to help you conquer your day. How's your focus holding up today? Got any big tasks on your plate?`,
      timestamp: Date.now(),
    };
  }

  // 4. Gratitude & Acknowledgements
  if (/^(thank|thanks|thx|appreciate|awesome|great|cool|nice|okay|ok)\b/i.test(prompt)) {
    return {
      id,
      sender: 'assistant',
      text: `You're very welcome! 😊 Always here to support your focus and peace of mind. Let me know whenever you want to chat, brainstorm, or review your guardrails!`,
      timestamp: Date.now(),
    };
  }

  // 5. Jokes & Humor
  if (prompt.includes('joke') || prompt.includes('funny') || prompt.includes('make me laugh')) {
    const jokes = [
      `Why did the dollar bill go to therapy? Because it was feeling under too much pressure from inflation! 😂`,
      `Why do economists love nature? Because they love supply and de-sand! 🏖️`,
      `What's a budget's favorite dance move? The balance step! 💃`,
    ];
    return {
      id,
      sender: 'assistant',
      text: `${jokes[Math.floor(Math.random() * jokes.length)]}\n\nHope that brought a smile to your face! What are you working on right now?`,
      timestamp: Date.now(),
    };
  }

  // 6. Focus & Productivity Hacks
  if (
    prompt.includes('focus') ||
    prompt.includes('pomodoro') ||
    prompt.includes('procrastinat') ||
    prompt.includes('distract') ||
    prompt.includes('habit') ||
    prompt.includes('concentrat')
  ) {
    return {
      id,
      sender: 'assistant',
      text: `Here is the core rule of the **Single-Focus OS** 🎯:\n\n1. **Stop Multitasking:** Context switching drains up to 40% of cognitive energy.\n2. **Rule of 3:** Keep no more than 3 high-priority tasks in your queue.\n3. **Enforce 1 In-Progress:** Commit to exactly one active task, start the 25-minute Pomodoro, and give yourself permission to ignore everything else until the chime rings.\n\nWant to pick one task to knock out together right now?`,
      timestamp: Date.now(),
    };
  }

  // 7. Identity & Capabilities
  if (prompt.includes('who are you') || prompt.includes('what can you do')) {
    return {
      id,
      sender: 'assistant',
      text: `I'm your **FocusGuard Companion & AI Advisor**! 🛡️✨\n\nHere's what we can do together:\n- **Friendly Chat & Venting:** Talk about your day, stress relief, work habits, or mindfulness.\n- **Salary Guardrails:** Ask me how to budget any salary (e.g. *"Plan 10,000 salary"*) so you never run out mid-month.\n- **Spend Recovery:** Get immediate advice if you overspent or need to recover a sprint.\n- **Live Google Gemini:** Connect your free Gemini key at the top for real-time live AI conversation!`,
      timestamp: Date.now(),
    };
  }

  // 8. Detect salary number in prompt (e.g. "10000", "10,000", "5000", "1500")
  const numberMatch = prompt.match(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/);
  const detectedNumber = numberMatch ? parseFloat(numberMatch[0].replace(/,/g, '')) : null;

  // Scenario A: User asks about a specific salary (e.g. 10000)
  if (detectedNumber && (detectedNumber >= 500 || prompt.includes('salary') || prompt.includes('earn') || prompt.includes('pay') || prompt.includes('budget'))) {
    const plan = generateSalaryBlueprint(detectedNumber, currencySymbol, prompt.includes('debt') || prompt.includes('stuck') ? 'DEBT_DEFENSE' : 'BALANCED');
    
    return {
      id,
      sender: 'assistant',
      text: `### 🎯 Strategic Blueprint for ${formatCurrency(detectedNumber, currencySymbol)} Salary\n\nIf you earn **${formatCurrency(detectedNumber, currencySymbol)}**, the biggest mistake is spending without strict sprint guardrails. Here is how you allocate it so you **never run dry mid-month**:\n\n1. **Fixed Non-Negotiables (${formatCurrency(plan.salary - plan.discretionaryPool - plan.emergencyBuffer, currencySymbol)}):** Paid on Day 1.\n   - Rent/Housing: ~${formatCurrency(Math.round(detectedNumber * 0.30), currencySymbol)}\n   - Loans/Finance: ~${formatCurrency(Math.round(detectedNumber * 0.15), currencySymbol)}\n   - Utility Baselines: ~${formatCurrency(Math.round(detectedNumber * 0.05), currencySymbol)}\n\n2. **Emergency Shield (${formatCurrency(plan.emergencyBuffer, currencySymbol)}):** Automatically deducted into savings before discretionary spending starts.\n\n3. **Sprint Division Guardrails:**\n   - **Discretionary Pool:** ${formatCurrency(plan.discretionaryPool, currencySymbol)}\n   - **Weekly Sprint Cap:** **${formatCurrency(plan.weeklyCap, currencySymbol)} / 7 days**\n   - **Safe Daily Allowance:** **${formatCurrency(plan.dailyAllowance, currencySymbol)} / day**\n\nTap below to apply this exact setup directly into your FocusGuard engine!`,
      timestamp: Date.now(),
      recommendedPlan: plan,
    };
  }

  // Scenario B: User asks about financial debt / commitments too high
  if (
    (prompt.includes('stuck') || prompt.includes('drain')) &&
    (prompt.includes('money') || prompt.includes('salary') || prompt.includes('bills') || prompt.includes('financial') || prompt.includes('afford')) ||
    prompt.includes('debt') ||
    prompt.includes('loan') ||
    prompt.includes('broke')
  ) {
    const salary = currentBudget?.netSalary || 5000;
    const plan = generateSalaryBlueprint(salary, currencySymbol, 'DEBT_DEFENSE');

    return {
      id,
      sender: 'assistant',
      text: `### 🚨 Anti-Drain Triage: Breaking the Mid-Month Financial Trap\n\nWhen fixed commitments threaten to drain your salary early, follow this 3-rule protocol:\n\n1. **The Day 1 Envelope Rule**: When your salary arrives, isolate your non-negotiables (rent, loan) immediately. Never allow loan payments to float into the middle of the month.\n\n2. **Isolate the Emergency Buffer (${formatCurrency(plan.emergencyBuffer, currencySymbol)})**: Even 5% protects you from having to borrow when a small surprise bill arrives.\n\n3. **Sprint Envelopes (${formatCurrency(plan.weeklyCap, currencySymbol)} / week)**: Never view your discretionary pool as a single lump sum. Divide into 4 strict weekly blocks of **${formatCurrency(plan.weeklyCap, currencySymbol)}**. If you overspend today, the engine will automatically reduce tomorrow's daily spend to prevent a freeze.\n\nWould you like me to restructure your budget with this debt-defense guardrail?`,
      timestamp: Date.now(),
      recommendedPlan: plan,
    };
  }

  // Scenario C: User asks how to recover from overspending
  if (prompt.includes('recover') || prompt.includes('overspend') || prompt.includes('freeze') || (prompt.includes('warning') && prompt.includes('spend'))) {
    const isFrozen = analysis.isWeeklyLimitReached;
    const overAmt = Math.abs(analysis.remainingToday);

    return {
      id,
      sender: 'assistant',
      text: isFrozen
        ? `### ❄️ Sprint Freeze Recovery Protocol\n\nYour weekly discretionary limit of **${formatCurrency(analysis.weeklyCap, currencySymbol)}** is reached for Sprint ${analysis.sprint.sprintNumber}.\n\n**Recovery Steps:**\n1. **Halt Discretionary Spend:** For the next ${analysis.sprint.remainingDays} days, freeze dining out, non-essential fuel, and miscellaneous shopping.\n2. **Rely on Pantry & Baseline Utilities:** Use already-purchased groceries.\n3. **Sprint Reset Countdown:** In ${analysis.sprint.remainingDays} days, Sprint ${analysis.sprint.sprintNumber < 4 ? analysis.sprint.sprintNumber + 1 : 1} will unlock a fresh **${formatCurrency(analysis.weeklyCap, currencySymbol)}** cap. Do not pull from your emergency buffer unless it is a true medical or survival emergency!`
        : `### ⚖️ Dynamic Compensation in Action\n\nRight now you have an active guardrail penalty of **${formatCurrency(overAmt, currencySymbol)}**.\n\n**Good news:** The engine automatically absorbs this by shrinking tomorrow's safe spend from **${formatCurrency(analysis.dailySafeSpend, currencySymbol)}** to **${formatCurrency(analysis.projectedTomorrowAllowance, currencySymbol)}**.\n\n**Advisor Tip:** If you spend $0 tomorrow on misc/dining, your daily allowance for the rest of Sprint ${analysis.sprint.sprintNumber} will rebound back to healthy green!`,
      timestamp: Date.now(),
    };
  }

  // Scenario D: Explicit Financial Diagnostic / Audit (Only when specifically asked!)
  const isAskingForAudit =
    prompt.includes('audit') ||
    prompt.includes('diagnostic') ||
    prompt.includes('report') ||
    prompt.includes('financial status') ||
    prompt.includes('review my budget') ||
    prompt.includes('checkup') ||
    prompt.includes('financial health') ||
    (prompt.includes('numbers') && prompt.includes('my'));

  const currentSalary = currentBudget?.netSalary || 0;
  if (isAskingForAudit && currentSalary > 0) {
    const health = evaluateFinancialHealth(currentBudget, analysis);

    return {
      id,
      sender: 'assistant',
      text: `### 📊 Live Financial Audit & Recommendation\n\nHere is your live diagnostic for this month:\n- **Net Monthly Salary:** ${formatCurrency(currentSalary, currencySymbol)}\n- **Fixed Commitments:** ${formatCurrency(analysis.totalFixedCommitments, currencySymbol)} (${health.ratioFixedPercent}% of income)\n- **Discretionary Pool:** ${formatCurrency(analysis.discretionaryPool, currencySymbol)}\n- **Weekly Sprint Cap:** ${formatCurrency(analysis.weeklyCap, currencySymbol)} / week\n- **Today's Status:** ${analysis.isWeeklyLimitReached ? '🚨 Weekly Freeze Active' : analysis.isOverDailySpend ? '⚠️ Over Daily Safe Spend' : '🟢 Safe & On Track'}\n\n**Advisor Verdict (${health.statusLabel}):**\n${
        health.ratioFixedPercent > 65
          ? `Your fixed non-negotiables take up ${health.ratioFixedPercent}% of your income. That leaves very thin margins. Consider refinancing loans or setting lower utility targets to increase your weekly cap.`
          : `Your fixed load is healthy at ${health.ratioFixedPercent}%. Stick to your **${formatCurrency(analysis.dailySafeSpend, currencySymbol)} daily safe spend** to maintain full financial control through Day 28+!`
      }\n\nFeel free to ask me anything—whether it's casual conversation, work focus tips, or budgeting questions!`,
      timestamp: Date.now(),
    };
  }

  // Scenario E: Warm Casual Conversation Fallback (Never dump cold numbers on friendly chat!)
  return {
    id,
    sender: 'assistant',
    text: `I'm listening! 💬\n\nWe can chat freely about how your day is going, explore quick productivity hacks, or plan your salary sprints whenever you want.\n\nWhat's on your mind right now?`,
    timestamp: Date.now(),
  };
}
