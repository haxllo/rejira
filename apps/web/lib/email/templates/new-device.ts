export function newDeviceTemplate(props: { name: string; browser: string; os: string; location: string; timestamp: string }) {
  return {
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">New sign-in to rejira</h2>
      <p style="color:#a1a1aa">Hi ${props.name}, a new sign-in was detected from an unrecognized device.</p>
      <div style="background:#23232a;border-radius:6px;padding:16px;margin:16px 0">
        <p style="color:#e4e4e7;margin:4px 0"><strong>Browser:</strong> ${props.browser}</p>
        <p style="color:#e4e4e7;margin:4px 0"><strong>Operating system:</strong> ${props.os}</p>
        <p style="color:#e4e4e7;margin:4px 0"><strong>Approximate location:</strong> ${props.location}</p>
        <p style="color:#e4e4e7;margin:4px 0"><strong>Time:</strong> ${props.timestamp}</p>
      </div>
      <p style="color:#a1a1aa">If this was you, you can ignore this email. If not, change your password immediately.</p>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/settings/sessions" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px">View active sessions</a>
      <p style="color:#52525b;font-size:12px;margin-top:24px;border-top:1px solid #2a2a30;padding-top:16px">rejira security</p>
    </div>`,
    text: `New sign-in to rejira\n\nHi ${props.name}, a new sign-in was detected from an unrecognized device.\n\nBrowser: ${props.browser}\nOS: ${props.os}\nLocation: ${props.location}\nTime: ${props.timestamp}\n\nIf this was you, ignore this email. If not, change your password immediately.\n\nView active sessions: ${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/settings/sessions`,
  };
}
