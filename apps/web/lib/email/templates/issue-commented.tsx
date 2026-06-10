export interface IssueCommentedProps {
  name: string;
  commenterName: string;
  issueKey: string;
  issueTitle: string;
  issueUrl: string;
  commentBody: string;
  projectName: string;
}

export function issueCommentedTemplate(props: IssueCommentedProps) {
  const { name, commenterName, issueKey, issueTitle, issueUrl, commentBody, projectName } = props;
  return {
    html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">New comment on ${issueKey}</h2>
      <p style="color:#a1a1aa"><strong style="color:#e4e4e7">${commenterName}</strong> commented on <strong style="color:#e4e4e7">${issueKey}</strong> in <strong style="color:#e4e4e7">${projectName}</strong>.</p>
      <p style="color:#e4e4e7;font-size:13px;padding:12px;background:#27272a;border-radius:6px;border-left:3px solid #4f46e5;">${commentBody}</p>
      <a href="${issueUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px;font-weight:600">View Issue</a>
      <p style="color:#52525b;font-size:12px;margin-top:24px">You received this because you're watching this issue.</p>
    </div>`,
    text: `${commenterName} commented on ${issueKey} in ${projectName}: ${issueTitle}\n\n"${commentBody}"\n\nView: ${issueUrl}`,
  };
}
