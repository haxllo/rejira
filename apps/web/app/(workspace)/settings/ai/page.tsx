import 'server-only';

import { db } from '@/lib/db';
import { workspaceSecurityPolicy } from '@/lib/db/schema/workspace-security-policy';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/require-auth';
import { getActiveWorkspaceId } from '@/lib/auth/workspace-helpers';
import { AiKeyForm } from './ai-key-form';

export default async function AISettingsPage() {
  await requireAuth();
  const workspaceId = await getActiveWorkspaceId();

  const [policy] = await db
    .select()
    .from(workspaceSecurityPolicy)
    .where(eq(workspaceSecurityPolicy.workspaceId, workspaceId));

  const spent = policy?.monthlyAiSpentCents ?? 0;
  const budget = policy?.monthlyAiBudgetCents ?? 1000;
  const percent = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-[20px] font-semibold tracking-tight text-[var(--color-text)]">
            AI & Search
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            Configure AI features, provider keys, and monthly budgets for this workspace.
          </p>
        </div>

        <AiKeyForm
          workspaceId={workspaceId}
          initialApiKey={policy?.aiApiKey ? 'exists' : null}
          initialProvider={policy?.aiProvider ?? 'openai'}
          initialBudget={budget}
          initialEnabled={policy?.aiFeaturesEnabled ?? true}
          spent={spent}
          percent={percent}
        />
      </div>
    </div>
  );
}
