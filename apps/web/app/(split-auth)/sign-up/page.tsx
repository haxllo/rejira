import { SignUpFormSplit } from '@/components/auth/sign-up-form-split';
import { OAuthButtonsSplit } from '@/components/auth/oauth-buttons-split';
import { AuthSplitShell } from '@/components/auth/auth-split-shell';

export default function SignUpPage() {
  return (
    <AuthSplitShell>
      <div className="auth-split-head">
        <h1 className="auth-split-title">Create an account</h1>
        <p className="auth-split-subtitle">Enter your details to create your rejira account</p>
      </div>

      <SignUpFormSplit />

      <div className="auth-split-or" aria-hidden="true">
        <span className="auth-split-or-label">OR</span>
      </div>

      <OAuthButtonsSplit />

      <p className="auth-split-footlink">
        Already have an account? <a href="/sign-in">Sign in</a>
      </p>
    </AuthSplitShell>
  );
}
