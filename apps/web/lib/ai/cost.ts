import 'server-only';

import { db } from '@/lib/db';
import { workspaceSecurityPolicy } from '@/lib/db/schema/workspace-security-policy';
import { eq, sql } from 'drizzle-orm';

const RATES: Record<string, number> = {
  'gpt-4o-mini': 0.00015,
  'gpt-4o': 0.0025,
  'text-embedding-3-small': 0.00002,
};

export async function recordAICost(
  workspaceId: string,
  model: string,
  tokens: number
): Promise<void> {
  const ratePerToken = RATES[model] ?? 0.00015;
  const costCents = Math.ceil(tokens * ratePerToken * 100);

  await db
    .update(workspaceSecurityPolicy)
    .set({
      monthlyAiSpentCents: sql`${workspaceSecurityPolicy.monthlyAiSpentCents} + ${costCents}`,
    })
    .where(eq(workspaceSecurityPolicy.workspaceId, workspaceId));
}

export async function checkAIBudget(
  workspaceId: string
): Promise<{ withinBudget: boolean; spent: number; budget: number }> {
  const [policy] = await db
    .select({
      spent: workspaceSecurityPolicy.monthlyAiSpentCents,
      budget: workspaceSecurityPolicy.monthlyAiBudgetCents,
    })
    .from(workspaceSecurityPolicy)
    .where(eq(workspaceSecurityPolicy.workspaceId, workspaceId));

  if (!policy) return { withinBudget: true, spent: 0, budget: 0 };

  const spent = policy.spent ?? 0;
  const budget = policy.budget ?? 1000;

  return {
    withinBudget: spent < budget,
    spent,
    budget,
  };
}
