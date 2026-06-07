// Phase 3 — Stream 3B: Email templates.
//
// Inline HTML templates for auth emails. 3K replaces these with
// React Email components (@react-email/components) for preview support.

export function welcomeTemplate(props: { name: string }) {
  return {
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">Welcome to Rejira, ${props.name}</h2>
      <p style="color:#a1a1aa">Your account is ready. Sign in to start tracking issues with your team.</p>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/sign-in" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px">Sign In</a>
    </div>`,
    text: `Welcome to Rejira, ${props.name}!\n\nYour account is ready. Sign in at ${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/sign-in`,
  };
}

export function verifyEmailTemplate(props: { name: string; url: string }) {
  return {
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">Verify your email</h2>
      <p style="color:#a1a1aa">Hi ${props.name}, click the button below to verify your email address.</p>
      <a href="${props.url}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px">Verify Email</a>
      <p style="color:#52525b;font-size:12px;margin-top:24px">If you didn't create this account, you can ignore this email.</p>
    </div>`,
    text: `Hi ${props.name},\n\nVerify your email by clicking: ${props.url}\n\nIf you didn't create this account, ignore this email.`,
  };
}

export function magicLinkTemplate(props: { name: string; url: string }) {
  return {
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">Sign in to Rejira</h2>
      <p style="color:#a1a1aa">Hi ${props.name}, click the button below to sign in instantly.</p>
      <a href="${props.url}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px">Sign In</a>
      <p style="color:#52525b;font-size:12px;margin-top:24px">This link expires in 15 minutes and can only be used once.</p>
    </div>`,
    text: `Sign in to Rejira by clicking: ${props.url}\n\nThis link expires in 15 minutes.`,
  };
}

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

export function resetPasswordTemplate(props: { name: string; url: string }) {
  return {
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">Reset your password</h2>
      <p style="color:#a1a1aa">Hi ${props.name}, click the button below to reset your password.</p>
      <a href="${props.url}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px">Reset Password</a>
      <p style="color:#52525b;font-size:12px;margin-top:24px">If you didn't request this, you can ignore this email.</p>
    </div>`,
    text: `Reset your password by clicking: ${props.url}\n\nIf you didn't request this, ignore this email.`,
  };
}
