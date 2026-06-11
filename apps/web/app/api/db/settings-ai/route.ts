export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/require-auth';
import { getActiveWorkspaceId } from '@/lib/auth/workspace-helpers';
import { db, mapDrizzleError } from '@/lib/db';
import { workspaceSecurityPolicy } from '@/lib/db/schema/workspace-security-policy';

const UpdateAISettingsSchema = z.object({
  aiApiKey: z.string().nullable().optional(),
  aiProvider: z.enum(['openai', 'anthropic']).optional(),
  monthlyAiBudgetCents: z.number().int().min(0).max(100000).optional(),
  aiFeaturesEnabled: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const workspaceId = await getActiveWorkspaceId();

    const body = await request.json();
    const parsed = UpdateAISettingsSchema.parse(body);

    await db
      .update(workspaceSecurityPolicy)
      .set({
        ...(parsed.aiApiKey !== undefined ? { aiApiKey: parsed.aiApiKey } : {}),
        ...(parsed.aiProvider ? { aiProvider: parsed.aiProvider } : {}),
        ...(parsed.monthlyAiBudgetCents !== undefined ? { monthlyAiBudgetCents: parsed.monthlyAiBudgetCents } : {}),
        ...(parsed.aiFeaturesEnabled !== undefined ? { aiFeaturesEnabled: parsed.aiFeaturesEnabled } : {}),
        updatedAt: new Date(),
      })
      .where(eq(workspaceSecurityPolicy.workspaceId, workspaceId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) throw error;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    const mapped = mapDrizzleError(error);
    if (mapped) {
      return NextResponse.json({ error: mapped.message, code: mapped.code }, { status: mapped.statusCode });
    }
    return NextResponse.json({ error: 'Failed to update AI settings' }, { status: 500 });
  }
}
