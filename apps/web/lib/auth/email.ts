import 'server-only';

import { transport } from '@/lib/email/transport';
import { render } from '@/lib/email/render';
import type { EmailPayload } from '@/lib/email/transport';

interface SendEmailParams {
  to: string;
  subject: string;
  template: string;
  data: Record<string, string>;
}

export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  const payload = render(params.template, {
    ...params.data,
    to: params.to,
    subject: params.subject,
  });

  if (!payload) {
    console.error(`[auth-email] Template "${params.template}" not found`);
    return { ok: false, error: `Template "${params.template}" not found` };
  }

  return transport.send(payload);
}
