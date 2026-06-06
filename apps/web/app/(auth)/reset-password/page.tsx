// Phase 3 — Stream 3B: Reset password page.
//
// This page is linked from the reset password email. The token is
// passed as a query parameter.

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="auth-title">Set a new password</h1>
      <p className="auth-description">
        Choose a strong password (min 12 characters).
      </p>
      <ResetPasswordForm />
      <p className="auth-footer">
        <a href="/sign-in">Back to sign in</a>
      </p>
    </>
  );
}
