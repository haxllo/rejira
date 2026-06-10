export interface IssueAssignedProps {
  name: string;
  assignerName: string;
  issueKey: string;
  issueTitle: string;
  issueUrl: string;
  projectName: string;
}

export function issueAssignedTemplate(props: IssueAssignedProps) {
  const { name, assignerName, issueKey, issueTitle, issueUrl, projectName } = props;
  return {
    html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">You've been assigned</h2>
      <p style="color:#a1a1aa"><strong style="color:#e4e4e7">${assignerName}</strong> assigned you to <strong style="color:#e4e4e7">${issueKey}</strong> in <strong style="color:#e4e4e7">${projectName}</strong>.</p>
      <p style="color:#a1a1aa;font-size:13px;padding:12px;background:#27272a;border-radius:6px;">${issueTitle}</p>
      <a href="${issueUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px;font-weight:600">View Issue</a>
      <p style="color:#52525b;font-size:12px;margin-top:24px">You received this because you were assigned to this issue.</p>
    </div>`,
    text: `${assignerName} assigned you to ${issueKey} in ${projectName}: ${issueTitle}\n\nView: ${issueUrl}`,
  };
}
