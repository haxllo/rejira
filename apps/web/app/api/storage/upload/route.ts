import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { getActiveWorkspaceId } from '@/lib/auth/workspace-helpers';
import { getPresignedUploadUrl, deleteFile, isAllowedFile } from '@/lib/integrations/storage';
import { createId } from '@/lib/utils/id';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const workspaceId = await getActiveWorkspaceId();
    const { fileName, contentType, fileSize } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType required' }, { status: 400 });
    }

    if (!isAllowedFile(contentType, fileSize ?? 0)) {
      return NextResponse.json(
        { error: 'File type not allowed or exceeds 10MB limit' },
        { status: 400 }
      );
    }

    const key = `${workspaceId}/${createId('file')}_${fileName}`;
    const uploadUrl = await getPresignedUploadUrl(key, contentType);

    return NextResponse.json({ uploadUrl, key, fileName, contentType });
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();
    const { key } = await request.json();
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
    await deleteFile(key);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
