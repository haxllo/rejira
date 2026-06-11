import crypto from 'crypto';

const ISSUE_KEY_RE = /([A-Z]+-\d+)/g;

export function verifyGitHubWebhook(
  signature: string,
  body: string,
  secret: string
): boolean {
  if (!signature || !secret) return false;
  const prefix = 'sha256=';
  const sig = signature.startsWith(prefix) ? signature.slice(prefix.length) : signature;
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(hmac));
  } catch {
    return false;
  }
}

export function extractIssueKeys(text: string): string[] {
  if (!text) return [];
  const matches = text.match(ISSUE_KEY_RE);
  return [...new Set(matches ?? [])];
}
