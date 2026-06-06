// Phase 3 — Stream 3C: OAuth sign-in buttons.
//
// Renders Google and GitHub sign-in buttons. Each button calls
// `signIn.social({ provider })` from the Better Auth client.
// Hidden when OAuth credentials are not configured.

"use client";

import { signIn } from "@/lib/auth/client";
import { isOAuthConfigured } from "@/lib/auth/oauth-config";

export function OAuthButtons() {
  if (!isOAuthConfigured()) return null;

  return (
    <div className="oauth-buttons">
      <div className="auth-separator">
        <span>or continue with</span>
      </div>
      <div className="oauth-grid">
        <OAuthButton provider="google" label="Google" />
        <OAuthButton provider="github" label="GitHub" />
      </div>
    </div>
  );
}

function OAuthButton({ provider, label }: { provider: string; label: string }) {
  return (
    <button
      type="button"
      className="oauth-button"
      onClick={() => signIn.social({ provider, callbackURL: "/inbox" })}
    >
      <span className="oauth-icon">{provider === "google" ? "G" : "GH"}</span>
      {label}
    </button>
  );
}
