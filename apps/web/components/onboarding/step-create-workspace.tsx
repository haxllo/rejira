'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/primitives/button';
import { cn } from '@/lib/utils';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 32;
}

interface StepCreateWorkspaceProps {
  initialName?: string;
  initialSlug?: string;
  onBack: () => void;
  onContinue: (name: string, slug: string) => void;
}

export function StepCreateWorkspace({
  initialName = '',
  initialSlug = '',
  onBack,
  onContinue,
}: StepCreateWorkspaceProps) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (!slug || slug === generateSlug(name)) {
        setSlug(generateSlug(value));
      }
    },
    [name, slug],
  );

  const handleSlugBlur = useCallback(() => {
    if (!slug || !isValidSlug(slug)) return;

    setChecking(true);
    const timer = setTimeout(() => {
      setSlugAvailable(true);
      setChecking(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [slug]);

  const canContinue = name.trim().length > 0 && isValidSlug(slug);

  return (
    <div className="flex flex-col">
      <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-text)]">
        Create your workspace
      </h2>
      <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
        Your workspace is where your team collaborates on projects.
      </p>

      <div className="mt-8 space-y-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--color-text)]">
            Workspace name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="My Workspace"
            autoFocus
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-text)] outline-none transition-colors duration-[120ms] focus:border-[var(--color-border-strong)]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--color-text)]">
            Workspace URL
          </span>
          <div className="flex items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]">
            <span className="px-3 text-[12px] text-[var(--color-text-muted)] select-none">
              rejira.app/
            </span>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugAvailable(null);
              }}
              onBlur={handleSlugBlur}
              placeholder="my-workspace"
              className="flex-1 h-9 bg-transparent px-1 text-[13px] text-[var(--color-text)] outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            {!slug && (
              <span className="text-[11px] text-[var(--color-text-faint)]">
                3-32 characters, lowercase letters, numbers, and hyphens
              </span>
            )}
            {slug && !isValidSlug(slug) && (
              <span className="text-[11px] text-[var(--color-danger)]">
                Invalid format
              </span>
            )}
            {slug && isValidSlug(slug) && checking && (
              <span className="text-[11px] text-[var(--color-text-faint)]">
                Checking availability...
              </span>
            )}
            {slug && isValidSlug(slug) && slugAvailable === true && (
              <span className="text-[11px] text-[var(--color-success)]">
                Available
              </span>
            )}
          </div>
        </label>

        <p className="text-[12px] text-[var(--color-text-faint)]">
          You can create more workspaces later.
        </p>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => onContinue(name.trim(), slug)}
          disabled={!canContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

export { generateSlug, isValidSlug };
