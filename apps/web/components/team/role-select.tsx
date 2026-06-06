// Phase 3 — Stream 3E: Role select dropdown.
"use client";

import { useState } from "react";

const roles = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "guest", label: "Guest" },
];

export function RoleSelect({ value, onChange }: {
  value: string;
  onChange: (role: string) => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="auth-field" style={{ height: 36, padding: "0 8px", borderRadius: 6 }}>
      {roles.map((r) => (
        <option key={r.value} value={r.value}>{r.label}</option>
      ))}
    </select>
  );
}
