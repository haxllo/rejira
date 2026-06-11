'use client';

import * as React from 'react';
import { SparklesIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface Props {
  workspaceId: string;
  initialApiKey: 'exists' | null;
  initialProvider: string;
  initialBudget: number;
  initialEnabled: boolean;
  spent: number;
  percent: number;
}

export function AiKeyForm({
  workspaceId,
  initialApiKey,
  initialProvider,
  initialBudget,
  initialEnabled,
  spent,
  percent,
}: Props) {
  const [provider, setProvider] = React.useState(initialProvider);
  const [apiKey, setApiKey] = React.useState('');
  const [budget, setBudget] = React.useState(initialBudget);
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = React.useState(false);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/db/settings-ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          aiApiKey: apiKey || undefined,
          aiProvider: provider,
          monthlyAiBudgetCents: budget,
          aiFeaturesEnabled: enabled,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Save failed');
      }
      setMessage({ type: 'success', text: 'AI settings saved.' });
      setApiKey('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message ?? 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const removeKey = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/db/settings-ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          aiApiKey: null,
          aiFeaturesEnabled: false,
        }),
      });
      if (!res.ok) throw new Error('Failed to remove key');
      setShowRemoveConfirm(false);
      setEnabled(false);
      setMessage({ type: 'success', text: 'AI key removed. AI features disabled.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove AI key' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
        <h2 className="mb-4 text-[14px] font-semibold text-[var(--color-text)]">Provider & Key</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={initialApiKey ? 'sk-… (key saved)' : 'sk-...'}
              className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-[12px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
        <h2 className="mb-4 text-[14px] font-semibold text-[var(--color-text)]">Budget & Usage</h2>

        <div className="mb-4">
          <div className="flex items-center justify-between text-[12px] text-[var(--color-text-muted)]">
            <span>Monthly budget: ${(budget / 100).toFixed(2)}</span>
            <span>Spent: ${(spent / 100).toFixed(2)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                percent > 80 ? 'bg-[var(--color-danger)]' : percent > 50 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]',
              )}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
            Monthly Budget (cents)
          </label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(parseInt(e.target.value) || 0)}
            min={0}
            max={100000}
            className="h-8 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-[12px] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--color-text)]">AI Features</h2>
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              Enable AI-assisted search, triage, and summarization
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={cn(
              'relative h-5 w-9 rounded-full transition-colors',
              enabled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-3)]',
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform',
                enabled && 'translate-x-4',
              )}
            />
          </button>
        </div>
      </div>

      {message && (
        <div
          className={cn(
            'rounded-md px-3 py-2 text-[12px]',
            message.type === 'success' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
          )}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex h-7 items-center gap-1.5 rounded-md bg-[var(--color-text)] px-3 text-[12px] font-medium text-[var(--color-text-inverse)] hover:opacity-90 disabled:opacity-40"
        >
          <SparklesIcon size={11} />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>

        <button
          onClick={() => setShowRemoveConfirm(true)}
          className="h-7 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[12px] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
        >
          Remove AI Key
        </button>
      </div>

      {showRemoveConfirm && (
        <div className="rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4">
          <p className="mb-3 text-[12px] text-[var(--color-text-muted)]">
            This will disable all AI features for this workspace. You'll need to add a new key to re-enable them.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={removeKey}
              disabled={saving}
              className="h-7 rounded-md bg-[var(--color-danger)] px-3 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              {saving ? 'Removing…' : 'Confirm Remove'}
            </button>
            <button
              onClick={() => setShowRemoveConfirm(false)}
              className="h-7 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 text-[12px] text-[var(--color-text-muted)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
