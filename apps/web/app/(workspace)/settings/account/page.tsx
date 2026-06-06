// Phase 3 — Stream 3H: Account settings page.

export default function AccountSettingsPage() {
  return (
    <div style={{ maxWidth: 640, padding: "24px 0" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Account Settings</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <a href="/settings/members" style={{ padding: "12px 16px", background: "var(--color-bg-layer-2)", borderRadius: 8, border: "1px solid var(--color-border)", color: "var(--color-fg)", textDecoration: "none" }}>
          Members & Invites
        </a>
        <a href="/two-factor/setup" style={{ padding: "12px 16px", background: "var(--color-bg-layer-2)", borderRadius: 8, border: "1px solid var(--color-border)", color: "var(--color-fg)", textDecoration: "none" }}>
          Two-Factor Authentication
        </a>
      </div>
    </div>
  );
}
