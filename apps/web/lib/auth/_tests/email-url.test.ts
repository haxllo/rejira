import { describe, it, expect } from 'vitest';
import { buildVerificationPageUrl } from '@/lib/auth/email-url';

describe('buildVerificationPageUrl', () => {
  it('rewrites the default Better Auth callback URL to the verify-email page', () => {
    const apiUrl = 'http://localhost:3000/api/auth/verify-email?token=eyJhbGc.eyJzdWI&callbackURL=%2Finbox';
    const out = buildVerificationPageUrl(apiUrl, 'http://localhost:3000');
    expect(out).toBe('http://localhost:3000/verify-email?token=eyJhbGc.eyJzdWI');
  });

  it('preserves the original token exactly', () => {
    const token = 'abc.def-ghi_jkl%2B123%3D%3D';
    const apiUrl = `https://prod.example.com/api/auth/verify-email?token=${token}`;
    const out = buildVerificationPageUrl(apiUrl, 'https://prod.example.com');
    expect(out).toBe(`https://prod.example.com/verify-email?token=${token}`);
  });

  it('strips a trailing slash from the base URL', () => {
    const apiUrl = 'http://localhost:3000/api/auth/verify-email?token=tok';
    const out = buildVerificationPageUrl(apiUrl, 'http://localhost:3000/');
    expect(out).toBe('http://localhost:3000/verify-email?token=tok');
  });

  it('falls back to localhost when no base URL is provided', () => {
    const out = buildVerificationPageUrl('http://x/api/auth/verify-email?token=t', undefined);
    expect(out).toBe('http://localhost:3000/verify-email?token=t');
  });

  it('falls back to localhost when base URL is empty', () => {
    const out = buildVerificationPageUrl('http://x/api/auth/verify-email?token=t', '');
    expect(out).toBe('http://localhost:3000/verify-email?token=t');
  });

  it('returns the page URL without a token when the input has no token', () => {
    const out = buildVerificationPageUrl('http://x/api/auth/verify-email', 'http://localhost:3000');
    expect(out).toBe('http://localhost:3000/verify-email');
  });

  it('returns the input unchanged when it is empty', () => {
    const out = buildVerificationPageUrl('', 'http://localhost:3000');
    expect(out).toBe('');
  });

  it('recovers a token from a malformed URL via regex fallback', () => {
    const out = buildVerificationPageUrl('not-a-url?token=abc123', 'http://localhost:3000');
    expect(out).toBe('http://localhost:3000/verify-email?token=abc123');
  });
});
