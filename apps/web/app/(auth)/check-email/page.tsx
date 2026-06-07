'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function CheckEmailContent() {
  const params = useSearchParams();
  const email = params.get('email') ?? 'your email';

  return (
    <>
      <h1 className="auth-title">Check your email</h1>
      <p className="auth-description">
        We sent a verification link to <strong>{email}</strong>.
      </p>
      <div className="auth-form">
        <div className="auth-success">
          <p>Didn&apos;t receive it? Check your spam folder or try signing up again.</p>
        </div>
      </div>
      <p className="auth-footer">
        <a href="/sign-in">Back to sign in</a>
      </p>
    </>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<p className="auth-loading">Loading...</p>}>
      <CheckEmailContent />
    </Suspense>
  );
}
