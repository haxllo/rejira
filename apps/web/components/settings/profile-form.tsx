'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth/client';
import { Button } from '@/components/primitives/button';
import { UserIconCustom } from '@/components/icons';
import { cn } from '@/lib/utils';

const AVATAR_COLORS = [
  'oklch(0.72 0.18 40)',
  'oklch(0.68 0.18 160)',
  'oklch(0.66 0.18 220)',
  'oklch(0.70 0.18 280)',
  'oklch(0.72 0.18 340)',
  'oklch(0.68 0.18 10)',
  'oklch(0.64 0.18 190)',
  'oklch(0.74 0.15 310)',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function ProfileForm() {
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;

  const [name, setName] = useState((user?.name as string) ?? '');
  const [avatarColor, setAvatarColor] = useState(
    (user?.image as string)?.startsWith('oklch') ? (user.image as string) : AVATAR_COLORS[0],
  );
  const [customColor, setCustomColor] = useState('#6b5ce7');
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const initials = getInitials(name || (user?.name as string) || (user?.email as string) || 'U');
  const activeColor = isCustom ? customColor : avatarColor;

  const handleSave = async () => {
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const { authClient } = await import('@/lib/auth/client');
      const updateUser = (authClient as unknown as Record<string, CallableFunction>).updateUser;
      if (updateUser) {
        await updateUser({ name: name.trim(), image: activeColor });
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
      <div className="border-b border-[var(--color-border)] px-5 py-3.5">
        <h2 className="text-[13.5px] font-semibold text-[var(--color-text)]">Profile</h2>
        <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
          Your name and avatar are visible across all workspaces.
        </p>
      </div>

      <div className="space-y-6 p-5">
        <div className="flex items-center gap-5">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-[18px] font-bold text-white shadow-[var(--shadow-1)]"
            style={{ background: activeColor }}
          >
            {initials}
          </div>
          <div className="space-y-2">
            <div className="text-[12px] font-medium text-[var(--color-text-muted)]">
              Avatar color
            </div>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setAvatarColor(color);
                    setIsCustom(false);
                  }}
                  className={cn(
                    'h-6 w-6 rounded-full border-2 transition-shadow duration-[120ms]',
                    !isCustom && avatarColor === color
                      ? 'border-[var(--color-text)] shadow-[var(--shadow-1)]'
                      : 'border-transparent hover:shadow-[var(--shadow-1)]',
                  )}
                  style={{ background: color }}
                  aria-label="Select avatar color"
                />
              ))}
              <button
                type="button"
                onClick={() => setIsCustom(!isCustom)}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-shadow duration-[120ms]',
                  isCustom
                    ? 'border-[var(--color-text)] shadow-[var(--shadow-1)]'
                    : 'border-[var(--color-border)] hover:shadow-[var(--shadow-1)]',
                )}
                style={isCustom ? { background: customColor } : { background: 'var(--color-surface-2)' }}
                aria-label="Custom color"
              >
                {isCustom ? '' : '#'}
              </button>
            </div>
            {isCustom && (
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="h-7 w-full cursor-pointer rounded border border-[var(--color-border)] bg-[var(--color-bg)] p-0"
              />
            )}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--color-text)]">Display name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-text)] outline-none transition-colors duration-[120ms] focus:border-[var(--color-border-strong)]"
          />
        </label>

        {error && (
          <div className="rounded-md border border-[var(--color-danger)]/24 bg-[var(--color-danger)]/8 px-3 py-2 text-[12px] text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-[var(--color-success)]/24 bg-[var(--color-success-soft)] px-3 py-2 text-[12px] text-[var(--color-success)]">
            Profile updated successfully.
          </div>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={loading || !name.trim()}
        >
          {loading ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
