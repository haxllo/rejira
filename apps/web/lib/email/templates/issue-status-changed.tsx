export interface IssueStatusChangedProps {
  name: string;
  changerName: string;
  issueKey: string;
  issueTitle: string;
  oldStatus: string;
  newStatus: string;
  issueUrl: string;
  projectName: string;
}

export function issueStatusChangedTemplate(props: IssueStatusChangedProps) {
  const { name, changerName, issueKey, issueTitle, oldStatus, newStatus, issueUrl, projectName } = props;
  return {
    html: `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1f;color:#e4e4e7;border-radius:8px">
      <h2 style="color:#fff;margin-top:0">Status changed</h2>
      <p style="color:#a1a1aa"><strong style="color:#e4e4e7">${changerName}</strong> changed the status of <strong style="color:#e4e4e7">${issueKey}</strong> in <strong style="color:#e4e4e7">${projectName}</strong>.</p>
      <p style="color:#a1a1aa;font-size:13px;text-align:center;padding:8px 0;">
        <span style="background:#27272a;padding:6px 12px;border-radius:4px;">${oldStatus}</span>
        <span style="color:#52525b;padding:0 8px;">→</span>
        <span style="background:#4f46e5;padding:6px 12px;border-radius:4px;color:#fff;">${newStatus}</span>
      </p>
      <a href="${issueUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;margin-top:12px;font-weight:600">View Issue</a>
      <p style="color:#52525b;font-size:12px;margin-top:24px">You received this because you're watching ${issueKey}.</p>
    </div>`,
    text: `${changerName} changed ${issueKey} status from ${oldStatus} to ${newStatus} in ${projectName}: ${issueTitle}\n\nView: ${issueUrl}`,
  };
}
