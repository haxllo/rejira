// Phase 3 — Stream 3B: Sign-up page.

import { SignUpForm } from "@/components/auth/sign-up-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default function SignUpPage() {
  return (
    <>
      <h1 className="auth-title">Create your account</h1>
      <SignUpForm />
      <OAuthButtons />
      <p className="auth-footer">
        Already have an account?{" "}
        <a href="/sign-in">Sign in</a>
      </p>
    </>
  );
}
