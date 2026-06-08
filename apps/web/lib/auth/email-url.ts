export function buildVerificationPageUrl(apiUrl: string, baseUrl: string | undefined): string {
  if (!apiUrl) return apiUrl;
  let token = '';
  try {
    const parsed = new URL(apiUrl);
    token = parsed.searchParams.get('token') ?? '';
  } catch {
    const match = apiUrl.match(/[?&]token=([^&]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }
  const origin = (baseUrl ?? '').replace(/\/$/, '') || 'http://localhost:3000';
  if (!token) return `${origin}/verify-email`;
  return `${origin}/verify-email?token=${encodeURIComponent(token)}`;
}
