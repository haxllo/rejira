// Phase 3 — Stream 3E: Accept invite page.

"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AcceptHandler() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"accepting" | "success" | "error">("accepting");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch("/api/auth/session")
      .then((r) => r.ok ? r.json() : null)
      .then((session) => {
        if (!session?.user) {
          window.location.href = `/sign-in?next=/invite/${token}`;
          return;
        }
        return fetch(`/api/function`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: "memberships:acceptInvite",
            format: "convex_encoded_json",
            args: [{ token }],
          }),
        });
      })
      .then(async (r) => {
        if (!r) return;
        if (r.ok) {
          setStatus("success");
          setTimeout(() => { window.location.href = "/inbox"; }, 2000);
        } else {
          setStatus("error");
          const err = await r.json();
          setError(err?.message ?? "Failed to accept invitation");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("Something went wrong");
      });
  }, [token]);

  return (
    <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: 40, background: "var(--color-bg-layer-2)", borderRadius: 12, border: "1px solid var(--color-border)" }}>
      {status === "accepting" && <p style={{ fontSize: 16 }}>Accepting invitation...</p>}
      {status === "success" && <p style={{ color: "hsl(150 60% 60%)", fontSize: 16 }}>Joined! Redirecting...</p>}
      {status === "error" && (
        <>
          <p style={{ color: "hsl(0 80% 70%)", fontSize: 16 }}>Could not accept invitation</p>
          <p style={{ color: "var(--color-fg-muted)", fontSize: 14, marginTop: 8 }}>{error}</p>
        </>
      )}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", marginTop: 80 }}>Loading...</p>}>
      <AcceptHandler />
    </Suspense>
  );
}
