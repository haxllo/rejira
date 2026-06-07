import { NextRequest, NextResponse } from 'next/server';
import { handleBounce } from '@/lib/email/bounce-handler';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get('resend-signature');
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (webhookSecret && !signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  if (webhookSecret && signature) {
    const encoder = new TextEncoder();
    const body = await request.clone().text();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(body),
    );

    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  try {
    const payload = await request.json();
    await handleBounce(payload);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[webhook] Failed to process bounce:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
