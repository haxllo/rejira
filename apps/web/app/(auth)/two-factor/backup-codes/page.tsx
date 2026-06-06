// Phase 3 — Stream 3D: Backup codes page.
//
// Shown after 2FA enrollment and whenever the user wants to view/regenerate.

"use client";

import { useState } from "react";
import { getBackupCodes } from "@/lib/auth/backup-codes";

export default function BackupCodesPage() {
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadCodes() {
    setLoading(true);
    try {
      const result = await getBackupCodes();
      setCodes((result as any)?.backupCodes ?? []);
    } catch {
      setCodes([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="auth-title">Backup codes</h1>
      {codes.length === 0 ? (
        <button className="auth-button" onClick={loadCodes} disabled={loading}>
          {loading ? "Loading..." : "View backup codes"}
        </button>
      ) : (
        <div className="backup-codes-grid">
          {codes.map((code, i) => (
            <code key={i} className="backup-code">{code}</code>
          ))}
        </div>
      )}
      <p className="auth-description">
        Each code can be used once to sign in if you lose access to your authenticator app.
      </p>
      <p className="auth-footer">
        <a href="/inbox">Done</a>
      </p>
    </>
  );
}
