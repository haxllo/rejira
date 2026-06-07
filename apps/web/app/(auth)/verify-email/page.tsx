// Phase 3 — Stream 3B: Verify email page.
//
// Better Auth redirects here after the user clicks the verify link.
// The page reads the token from the URL and calls the verify endpoint.

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";

function VerifyHandler() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No verification token found.');
      return;
    }
    authClient.verifyEmail({ query: { token } })
      .then((res) => {
        if (res && 'error' in res && res.error) {
          setStatus('error');
          setError(res.error.message ?? 'This link is invalid or has expired.');
        } else {
          setStatus('success');
          setTimeout(() => { window.location.href = '/sign-in'; }, 2000);
        }
      })
      .catch(() => {
        setStatus('error');
        setError('Something went wrong. Please try again.');
      });
  }, [token]);

  return (
    <>
      {status === "verifying" && <p className="auth-loading">Verifying your email...</p>}
      {status === "success" && <p className="auth-success">Email verified! Redirecting to sign in...</p>}
      {status === "error" && (
        <div>
          <p className="auth-error">{error}</p>
          <p className="auth-footer">
            <a href="/sign-in">Back to sign in</a>
          </p>
        </div>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <h1 className="auth-title">Email verification</h1>
      <Suspense fallback={<p className="auth-loading">Loading...</p>}>
        <VerifyHandler />
      </Suspense>
    </>
  );
}
