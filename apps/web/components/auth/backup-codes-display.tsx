// Phase 3 — Stream 3D: Backup codes display.

export function BackupCodesDisplay({ codes }: { codes: string[] }) {
  return (
    <div>
      <div className="auth-success">
        <p>Save these backup codes in a safe place:</p>
      </div>
      <div className="backup-codes-grid">
        {codes.map((code, i) => (
          <code key={i} className="backup-code">{code}</code>
        ))}
      </div>
      <p className="auth-description">
        Each code can be used once. You can generate new codes later.
      </p>
    </div>
  );
}
