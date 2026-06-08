import { Suspense } from 'react';
import { VerifyEmailForm } from './verify-email-form';

export const metadata = {
  title: 'Verify your email — Rejira',
};

export default function VerifyEmailPage() {
  return (
    <>
      <h1 className="auth-title">Email verification</h1>
      <Suspense
        fallback={
          <div className="auth-state" role="status" aria-live="polite">
            <div className="auth-state-icon auth-state-icon--neutral" />
            <h2 className="auth-state-title">Loading verification</h2>
            <p className="auth-state-description">Just a moment…</p>
          </div>
        }
      >
        <VerifyEmailForm />
      </Suspense>
    </>
  );
}
