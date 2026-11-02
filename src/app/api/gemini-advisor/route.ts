import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ChatHistoryItem {
  role: 'user' | 'model';
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, apiKey, context, history = [] } = body;

    const activeKey = apiKey || process.env.GEMINI_API_KEY;

    if (!activeKey) {
      return NextResponse.json(
        { 
          error: 'NO_API_KEY',
          message: 'No Gemini API key provided. Please configure your free Google AI Studio API key in Settings or environment variables.' 
        },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(activeKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: `You are FocusGuard Gemini — a warm, friendly, smart, and encouraging companion.
You act both as a great everyday conversational companion (friendly chat, productivity tips, motivation, work-life balance, mindfulness) AND an elite behavioral financial advisor.

Persona & Communication Style:
1. Warm & Conversational: If the user wants to chat casually ("Hey", "How are you doing?", "I'm feeling stressed today", "Tell me a joke", "What should I eat for dinner?"), respond naturally, warmly, and empathetically just like a good friend. You are NOT restricted to finance only!
2. Behavioral Financial Wisdom: When the user asks about salary, money, budgeting, expenses, or debt:
   - Apply the FocusGuard anti-drain philosophy: Day 1 Non-Negotiables envelope, 5-10% Emergency Shield, and dividing the remaining discretionary pool into 4 weekly sprints (7 days each) and daily safe spend.
   - Be ultra-encouraging, tactical, and help them avoid getting stuck.
3. Multi-Turn Context: Remember the user's previous questions and context throughout the conversation.

User's Live App Context (Use when relevant to finance/habits):
- Net Monthly Salary: ${context?.netSalary || 'Not set'} ${context?.currencySymbol || '$'}
- Fixed Commitments Total: ${context?.totalFixed || 0}
- Discretionary Pool: ${context?.discretionaryPool || 0}
- Weekly Sprint Cap: ${context?.weeklyCap || 0}
- Daily Safe Spend: ${context?.dailySafeSpend || 0}
- Spent Today: ${context?.spentToday || 0}
- Guardrail Status: ${context?.isWeeklyLimitReached ? 'Weekly limit reached / Frozen' : context?.isOverDailySpend ? 'Over daily safe spend' : 'On Track'}

Interactive Plan Card Rule:
ONLY when proposing a concrete salary division or budget restructuring (e.g. user asks to plan an income amount like 10,000, 5,000, or to reallocate their budget), append a clean JSON code block at the very end of your response:

\`\`\`json
{
  "isPlan": true,
  "strategyName": "Name of Strategy",
  "salary": 10000,
  "emergencyBuffer": 1000,
  "discretionaryPool": 4000,
  "weeklyCap": 1000,
  "dailyAllowance": 142.86,
  "fixedExpenses": [
    { "id": "plan_rent", "title": "Housing / Rent", "amount": 3000, "isPaid": false },
    { "id": "plan_loans", "title": "Loans / Finance", "amount": 1500, "isPaid": false },
    { "id": "plan_utilities", "title": "Utilities Baseline", "amount": 500, "isPaid": false }
  ]
}
\`\`\`

If the conversation is general friendly chat, do NOT include the JSON block—just chat naturally and warmly.`
    });

    // Format and sanitize multi-turn history for Gemini chat session
    // Gemini SDK requires history to:
    // 1. Start with role: 'user'
    // 2. Strictly alternate: user -> model -> user -> model
    // 3. End with role: 'model' (since chat.sendMessage(prompt) will append the new 'user' turn)
    const rawItems = (history as ChatHistoryItem[])
      .filter((h) => h.text && (h.role === 'user' || h.role === 'model'))
      .map((h) => ({ role: h.role, text: h.text.trim() }))
      .filter((h) => h.text.length > 0);

    const sanitizedHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

    for (const item of rawItems) {
      if (sanitizedHistory.length === 0) {
        // First entry in history MUST be from 'user'
        if (item.role === 'user') {
          sanitizedHistory.push({ role: 'user', parts: [{ text: item.text }] });
        }
      } else {
        const last = sanitizedHistory[sanitizedHistory.length - 1];
        if (item.role !== last.role) {
          sanitizedHistory.push({ role: item.role, parts: [{ text: item.text }] });
        } else {
          // Merge consecutive same-role turns into one turn
          last.parts[0].text += `\n\n${item.text}`;
        }
      }
    }

    // History must end with 'model' so chat.sendMessage(prompt) supplies the alternating 'user' turn
    while (sanitizedHistory.length > 0 && sanitizedHistory[sanitizedHistory.length - 1].role === 'user') {
      sanitizedHistory.pop();
    }

    // Keep the last 10 turns (5 full conversation pairs) for token efficiency
    const boundedHistory = sanitizedHistory.slice(-10);

    const chat = model.startChat({
      history: boundedHistory,
    });

    const result = await chat.sendMessage(prompt);
    const responseText = result.response.text();

    // Extract JSON block if present
    let recommendedPlan = null;
    let cleanText = responseText;

    const jsonMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.isPlan) {
          recommendedPlan = parsed;
          cleanText = responseText.replace(/```json\s*\{[\s\S]*?\}\s*```/, '').trim();
        }
      } catch (err) {
        console.warn('Failed to parse Gemini JSON block:', err);
      }
    }

    return NextResponse.json({
      text: cleanText,
      recommendedPlan,
      source: 'gemini',
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('Gemini Advisor Error:', err);
    return NextResponse.json(
      { 
        error: 'GEMINI_ERROR', 
        message: err.message || 'Error communicating with Google Gemini API.' 
      },
      { status: 500 }
    );
  }
}
