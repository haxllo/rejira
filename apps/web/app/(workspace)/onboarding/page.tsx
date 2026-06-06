// Phase 3 — Stream 3F: Post-signup onboarding wizard.
"use client";

import { useState } from "react";

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/function", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "workspaces:create", format: "convex_encoded_json", args: [{ name }] }),
      });
      if (res.ok) {
        const data = await res.json();
        setDone(true);
        setTimeout(() => { window.location.href = `/inbox?w=${data.slug}`; }, 1000);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Create your workspace</h1>
        {done ? (
          <p className="auth-success">Workspace created! Redirecting...</p>
        ) : (
          <form onSubmit={handleCreate} className="auth-form">
            <label className="auth-field">
              <span>Workspace name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="My Team" required />
            </label>
            <button type="submit" className="auth-button" disabled={loading || !name}>
              {loading ? "Creating..." : "Create workspace"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
