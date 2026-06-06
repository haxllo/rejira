// Phase 3 — Stream 3E: Invite form.
"use client";

import { useState } from "react";
import { RoleSelect } from "./role-select";

export function WorkspaceInviteForm({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { sendInvite } = await import("@/lib/auth/invites");
      await sendInvite(workspaceId, email, role);
      setDone(true);
      setEmail("");
    } catch (err: any) {
      setError(err.message ?? "Failed to send invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleInvite} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 200 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@company.com" required
          style={{ height: 36, padding: "0 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-fg)" }} />
      </label>
      <RoleSelect value={role} onChange={setRole} />
      <button type="submit" disabled={loading}
        className="auth-button" style={{ height: 36, padding: "0 16px", whiteSpace: "nowrap" }}>
        {loading ? "Sending..." : done ? "Sent!" : "Invite"}
      </button>
      {error && <div style={{ width: "100%", color: "hsl(0 80% 70%)", fontSize: 13 }}>{error}</div>}
    </form>
  );
}
