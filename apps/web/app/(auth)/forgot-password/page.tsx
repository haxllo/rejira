// Phase 3 — Stream 3B: Forgot password page.

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="auth-title">Reset your password</h1>
      <p className="auth-description">
        Enter your email and we&apos;ll send a reset link.
      </p>
      <ForgotPasswordForm />
      <p className="auth-footer">
        <a href="/sign-in">Back to sign in</a>
      </p>
    </>
  );
}
