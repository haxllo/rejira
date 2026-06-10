const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export interface UnsubscribeOptions {
  notificationType?: string;
  userId: string;
  token: string;
}

export function unsubscribeLink(options: UnsubscribeOptions): string {
  const params = new URLSearchParams({
    token: options.token,
    userId: options.userId,
  });
  if (options.notificationType) {
    params.set('type', options.notificationType);
  }
  return `${baseUrl}/unsubscribe?${params.toString()}`;
}

export function listUnsubscribeHeader(options: UnsubscribeOptions): string {
  const url = unsubscribeLink(options);
  return `<${url}>`;
}

export function unsubscribeFooter(options: UnsubscribeOptions): string {
  const url = unsubscribeLink(options);
  return `If you'd like to stop receiving these notifications, unsubscribe here: ${url}`;
}

export function unsubscribeFooterHtml(options: UnsubscribeOptions): string {
  const url = unsubscribeLink(options);
  return `<p style="color:#52525b;font-size:11px;margin-top:24px;padding-top:12px;border-top:1px solid #27272a;">
    <a href="${url}" style="color:#6366f1;text-decoration:none;">Unsubscribe</a> from these notifications
  </p>`;
}
