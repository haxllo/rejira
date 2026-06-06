// Phase 3 — Stream 3E: Members page.

import { WorkspaceInviteForm } from "@/components/team/workspace-invite-form";

export default function MembersPage() {
  return (
    <div style={{ maxWidth: 640, padding: "24px 0" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Members</h1>
      <WorkspaceInviteForm workspaceId="" />
      <p style={{ color: "var(--color-fg-muted)", fontSize: 13, marginTop: 12 }}>
        Invite teammates by email. They will receive a link to join the workspace.
      </p>
    </div>
  );
}
