export function passwordChangedTemplate(props: { name: string }) {
  return {
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">Password changed</h2>
      <p style="color:#a1a1aa">Hi ${props.name}, your password was successfully changed. If this was you, no further action is needed.</p>
      <p style="color:#52525b;font-size:12px;margin-top:24px;border-top:1px solid #2a2a30;padding-top:16px">If you did not change your password, please contact support immediately.</p>
    </div>`,
    text: `Password changed\n\nHi ${props.name}, your password was successfully changed. If this was you, no further action is needed.\n\nIf you did not change your password, please contact support immediately.`,
  };
}
