import { Suspense } from 'react';
import { SignInForm } from '@/components/auth/sign-in-form';
import { MagicLinkForm } from '@/components/auth/magic-link-form';
import { OAuthButtons } from '@/components/auth/oauth-buttons';

export default function SignInPage() {
  return (
    <>
      <h1 className="auth-title">Sign in to Rejira</h1>
      <Suspense
        fallback={
          <div className="auth-state" role="status" aria-live="polite">
            <div className="auth-state-icon auth-state-icon--neutral" />
            <h2 className="auth-state-title">Loading</h2>
          </div>
        }
      >
        <SignInForm />
      </Suspense>
      <div className="auth-separator">
        <span>or</span>
      </div>
      <MagicLinkForm />
      <OAuthButtons />
      <p className="auth-footer">
        Don&apos;t have an account? <a href="/sign-up">Sign up</a>
      </p>
    </>
  );
}
