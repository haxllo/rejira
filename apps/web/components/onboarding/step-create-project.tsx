'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/primitives/button';
import { cn } from '@/lib/utils';

function generateKey(name: string): string {
  const cleaned = name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    const key = (words[0][0] + words[1][0]).slice(0, 5);
    if (key.length >= 2) return key;
  }

  const fallback = cleaned.replace(/\s+/g, '').slice(0, 4);
  if (fallback.length >= 2) return fallback;

  return 'PROJ';
}

function isValidKey(key: string): boolean {
  return /^[A-Z]{2,5}$/.test(key);
}

interface StepCreateProjectProps {
  initialName?: string;
  initialKey?: string;
  onBack: () => void;
  onSkip: () => void;
  onContinue: (name: string, key: string) => void;
}

export function StepCreateProject({
  initialName = '',
  initialKey = '',
  onBack,
  onSkip,
  onContinue,
}: StepCreateProjectProps) {
  const [name, setName] = useState(initialName);
  const [key, setKey] = useState(initialKey);

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (!key || key === generateKey(name)) {
        setKey(generateKey(value));
      }
    },
    [name, key],
  );

  const canContinue = name.trim().length > 0 && isValidKey(key);

  return (
    <div className="flex flex-col">
      <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-text)]">
        Create your first project
      </h2>
      <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
        Projects help you organize issues for different teams or products.
      </p>

      <div className="mt-8 space-y-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--color-text)]">
            Project name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="My Project"
            autoFocus
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-text)] transition-colors duration-[120ms] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--color-text)]">
            Project key
          </span>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5))}
            placeholder="ENG"
            className={cn(
              'h-9 w-24 rounded-md border bg-[var(--color-bg)] px-3 text-[13px] font-mono uppercase tracking-wider text-[var(--color-text)] transition-colors duration-[120ms] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
              key && !isValidKey(key) ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]',
            )}
          />
          <div className="flex items-center gap-2">
            {key && !isValidKey(key) && (
              <span className="text-[11px] text-[var(--color-danger)]">
                2-5 uppercase letters required
              </span>
            )}
            {isValidKey(key) && (
              <span className="text-[11px] text-[var(--color-text-faint)]">
                Issues will look like{' '}
                <span className="font-mono text-[var(--color-text-muted)]">{key}-1234</span>
              </span>
            )}
            {!key && (
              <span className="text-[11px] text-[var(--color-text-faint)]">
                Project key is auto-generated from the name. Can be 2-5 uppercase letters.
              </span>
            )}
          </div>
        </label>

        <p className="text-[12px] text-[var(--color-text-faint)]">
          Project keys are used in issue identifiers. You can create more projects later.
        </p>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip for now
          </Button>
          <Button variant="primary" size="md" onClick={() => onContinue(name.trim(), key)}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
