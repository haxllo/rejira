import { Suspense } from 'react';
import { SignInFormSplit } from '@/components/auth/sign-in-form-split';
import { OAuthButtonsSplit } from '@/components/auth/oauth-buttons-split';
import { BrandMark } from '@/components/auth/brand-mark';
import { AuthSplitShell } from '@/components/auth/auth-split-shell';

export default function SignInPage() {
  const brand = <BrandMark size={22} />;
  return (
    <AuthSplitShell brandMark={brand}>
      <div className="auth-split-head">
        <h1 className="auth-split-title">Sign in</h1>
        <p className="auth-split-subtitle">Enter your email to sign in to your rejira account</p>
      </div>

      <Suspense
        fallback={
          <div className="auth-split-fields" role="status" aria-live="polite">
            <div className="auth-split-input" style={{ opacity: 0.5 }}>Loading…</div>
          </div>
        }
      >
        <SignInFormSplit />
      </Suspense>

      <div className="auth-split-or" aria-hidden="true">
        <span className="auth-split-or-label">OR</span>
      </div>

      <OAuthButtonsSplit />

      <p className="auth-split-footlink">
        Don&apos;t have an account? <a href="/sign-up">Sign up</a>
      </p>
    </AuthSplitShell>
  );
}
