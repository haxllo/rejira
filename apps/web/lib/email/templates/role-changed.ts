export function roleChangedTemplate(props: { name: string; workspaceName: string; newRole: string; changedBy: string }) {
  return {
    html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">Your role has changed</h2>
      <p style="color:#a1a1aa">Your role in <strong style="color:#e4e4e7">${props.workspaceName}</strong> has been changed to <strong style="color:#e4e4e7">${props.newRole}</strong> by ${props.changedBy}.</p>
      <p style="color:#52525b;font-size:12px;margin-top:24px">If you believe this was a mistake, contact your workspace owner.</p>
    </div>`,
    text: `Your role in ${props.workspaceName} has been changed to ${props.newRole} by ${props.changedBy}.\n\nIf you believe this was a mistake, contact your workspace owner.`,
  };
}
