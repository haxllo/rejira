import 'server-only';

import OpenAI from 'openai';
import { db } from '@/lib/db';
import { workspaceSecurityPolicy } from '@/lib/db/schema/workspace-security-policy';
import { eq } from 'drizzle-orm';

export function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}

export async function createWorkspaceAIClient(
  workspaceId: string
): Promise<OpenAI | null> {
  const [policy] = await db
    .select({
      apiKey: workspaceSecurityPolicy.aiApiKey,
      provider: workspaceSecurityPolicy.aiProvider,
      featuresEnabled: workspaceSecurityPolicy.aiFeaturesEnabled,
    })
    .from(workspaceSecurityPolicy)
    .where(eq(workspaceSecurityPolicy.workspaceId, workspaceId));

  if (!policy?.apiKey || policy.featuresEnabled === false) {
    return null;
  }

  return new OpenAI({ apiKey: policy.apiKey });
}
