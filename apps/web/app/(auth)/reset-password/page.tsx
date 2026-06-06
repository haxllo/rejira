// Phase 3 — Stream 3B: Reset password page.
//
// This page is linked from the reset password email. The token is
// passed as a query parameter.

import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

function ResetFormFallback() {
  return <p className="auth-loading">Loading...</p>;
}

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="auth-title">Set a new password</h1>
      <p className="auth-description">
        Choose a strong password (min 12 characters).
      </p>
      <Suspense fallback={<ResetFormFallback />}>
        <ResetPasswordForm />
      </Suspense>
      <p className="auth-footer">
        <a href="/sign-in">Back to sign in</a>
      </p>
    </>
  );
}
