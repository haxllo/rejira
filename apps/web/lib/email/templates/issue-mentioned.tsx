export interface IssueMentionedProps {
  name: string;
  mentionerName: string;
  issueKey: string;
  issueTitle: string;
  issueUrl: string;
  commentSnippet?: string;
}

export function issueMentionedTemplate(props: IssueMentionedProps) {
  const { name, mentionerName, issueKey, issueTitle, issueUrl, commentSnippet } = props;
  const snippetHtml = commentSnippet
    ? `<p style="color:#a1a1aa;font-size:13px;padding:12px;background:#27272a;border-radius:6px;border-left:3px solid #4f46e5;">${commentSnippet}</p>`
    : '';
  return {
    html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">You were mentioned</h2>
      <p style="color:#a1a1aa"><strong style="color:#e4e4e7">${mentionerName}</strong> mentioned you in <strong style="color:#e4e4e7">${issueKey}</strong>.</p>
      ${snippetHtml}
      <a href="${issueUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px;font-weight:600">View Issue</a>
      <p style="color:#52525b;font-size:12px;margin-top:24px">You received this because you were mentioned in a comment.</p>
    </div>`,
    text: `${mentionerName} mentioned you in ${issueKey}: ${issueTitle}${commentSnippet ? `\n\n"${commentSnippet}"` : ''}\n\nView: ${issueUrl}`,
  };
}
