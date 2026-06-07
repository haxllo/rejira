'use client';

import { useState } from 'react';
import { Button } from '@/components/primitives/button';

export function DataExportButton() {
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState('');

  const handleRequestExport = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/data-export', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to request data export');
      setRequested(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to request data export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
      <div className="border-b border-[var(--color-border)] px-5 py-3.5">
        <h2 className="text-[13.5px] font-semibold text-[var(--color-text)]">Export your data</h2>
        <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
          Download all your data across all workspaces in JSON format.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-[12px] text-[var(--color-text-muted)]">
          We&apos;ll prepare a JSON file with all your data across all workspaces.
          This may take a few minutes.
        </p>

        {requested ? (
          <div className="rounded-md border border-[var(--color-success)]/24 bg-[var(--color-success-soft)] px-3 py-2 text-[12px] text-[var(--color-success)]">
            Export requested. You&apos;ll receive an email when it&apos;s ready.
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRequestExport}
            disabled={loading}
          >
            {loading ? 'Requesting...' : 'Request data export'}
          </Button>
        )}

        {error && (
          <div className="rounded-md border border-[var(--color-danger)]/24 bg-[var(--color-danger)]/8 px-3 py-2 text-[12px] text-[var(--color-danger)]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
