export function workspaceInviteTemplate(props: { email: string; workspaceName: string; inviteUrl: string; role: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return {
    html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">You've been invited to join ${props.workspaceName}</h2>
      <p style="color:#a1a1aa">You've been invited to join <strong style="color:#e4e4e7">${props.workspaceName}</strong> on rejira as a <strong style="color:#e4e4e7">${props.role}</strong>.</p>
      <a href="${props.inviteUrl}" style="display:inline-block;padding:12px 24px;background:oklch(0.82 0.18 55);color:#1a1a1f;border-radius:6px;text-decoration:none;margin-top:12px;font-weight:600">Accept Invitation</a>
      <p style="color:#52525b;font-size:12px;margin-top:24px">This invitation expires in 7 days. If you weren't expecting this, you can ignore it.</p>
    </div>`,
    text: `You've been invited to join ${props.workspaceName} on rejira as a ${props.role}.\n\nAccept the invitation: ${props.inviteUrl}\n\nThis invitation expires in 7 days.`,
  };
}
