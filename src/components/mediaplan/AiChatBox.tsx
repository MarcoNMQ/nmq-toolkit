'use client';

import { useState } from 'react';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import type { AiChatKind, PlanConfig, Scenario } from '@/lib/mediaplan/types';

export function AiChatBox({ kind, scenario, plan, placeholder }: { kind: AiChatKind; scenario: Scenario; plan: PlanConfig; placeholder: string }) {
  const chat = useMediaPlanStore((s) => (kind === 'insights' ? s.insightsChat : kind === 'recs' ? s.recsChat : s.benchChat));
  const appendChat = useMediaPlanStore((s) => s.appendChat);
  const clearChat = useMediaPlanStore((s) => s.clearChat);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const userInput = input.trim();
    setInput('');
    appendChat(kind, { role: 'user', content: userInput });
    setLoading(true);
    try {
      const res = await fetch('/api/media-plan/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, scenario, plan, history: chat, userInput }),
      });
      const data = await res.json();
      appendChat(kind, { role: 'assistant', content: data.reply ?? data.error ?? 'No response.' });
    } catch (e) {
      appendChat(kind, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-ink-600">Chat — ask anything, the conversation keeps its memory</p>
        {chat.length > 0 && (
          <button onClick={() => clearChat(kind)} className="text-xs text-ink-400 hover:text-red-500">🗑 Clear conversation</button>
        )}
      </div>
      {chat.length > 0 && (
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-ink-100 bg-white p-2">
          {chat.map((m, i) => (
            <div key={i} className={`rounded-md p-2 text-xs ${m.role === 'user' ? 'bg-mint-100 text-ink-900' : 'bg-ink-50 text-ink-700'}`}>
              <span className="font-bold">{m.role === 'user' ? 'You' : 'Strategist'}: </span>{m.content}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !loading) send(); }}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-ink-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
        />
        <button onClick={send} disabled={loading || !input.trim()} className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40">
          {loading ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
