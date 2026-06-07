'use client';

import { useState, useEffect } from 'react';

interface SessionRow {
  id: string;
  ipHash: string;
  browser: string;
  os: string;
  lastActive: string;
  isCurrent: boolean;
}

export function SessionsList() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/sessions/list');
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions ?? []);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function revokeSession(sessionId: string) {
    try {
      await fetch('/api/auth/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      // handle error
    }
  }

  async function revokeAllOthers() {
    try {
      await fetch('/api/auth/sessions/revoke-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exceptCurrent: true }),
      });
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch {
      // handle error
    }
  }

  if (loading) {
    return (
      <div className="sessions-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="sessions-row skeleton" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="auth-description text-center py-4">
        This is your only active session.
      </div>
    );
  }

  return (
    <div className="sessions-list">
      <div className="sessions-header">
        <span className="sessions-count">{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</span>
      </div>
      {sessions.map((session) => (
        <div key={session.id} className="sessions-row">
          <div className="sessions-device">
            <span className="sessions-device-icon">
              {session.os.toLowerCase().includes('windows') ? '\u{1F4BB}' :
               session.os.toLowerCase().includes('mac') ? '\u{1F4BB}' :
               session.os.toLowerCase().includes('android') ? '\u{1F4F1}' :
               session.os.toLowerCase().includes('ios') ? '\u{1F4F1}' :
               '\u{1F310}'}
            </span>
            <div>
              <div className="sessions-browser">{session.browser}</div>
              <div className="sessions-meta">
                {session.os} &middot; IP {session.ipHash} &middot; {session.lastActive}
              </div>
            </div>
          </div>
          <div className="sessions-actions">
            {session.isCurrent ? (
              <span className="sessions-badge">Current</span>
            ) : (
              <button
                type="button"
                className="sessions-revoke"
                onClick={() => revokeSession(session.id)}
              >
                Revoke
              </button>
            )}
          </div>
        </div>
      ))}
      {sessions.length > 1 && (
        <button
          type="button"
          className="auth-button auth-button-secondary"
          onClick={revokeAllOthers}
        >
          Sign out all other devices
        </button>
      )}
    </div>
  );
}
