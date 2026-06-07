'use client';

import Link from 'next/link';
import { ChevronLeftIcon } from '@/components/icons';
import { DataExportButton } from '@/components/settings/data-export-button';
import { DeleteAccountButton } from '@/components/settings/delete-account-button';

export default function DataPage() {
  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <Link
          href="/settings/account"
          className="mb-6 inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-[120ms]"
        >
          <ChevronLeftIcon size={12} />
          Account
        </Link>

        <h1 className="mb-8 text-[20px] font-semibold tracking-tight text-[var(--color-text)]">
          Data & Privacy
        </h1>

        <div className="space-y-6">
          <DataExportButton />
          <DeleteAccountButton />
        </div>
      </div>
    </div>
  );
}
