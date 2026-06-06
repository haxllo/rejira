// Phase 3 — Stream 3B: Email rendering.
//
// Renders React Email templates to HTML and plaintext.
// Stub for now — 3B ships with inline HTML; React Email integration
// lands when `@react-email/components` is installed (3K).

import type { EmailPayload } from "./transport";

type TemplateFn = (props: Record<string, string>) => { html: string; text: string };

const templates: Record<string, TemplateFn> = {};

export function registerTemplate(name: string, fn: TemplateFn) {
  templates[name] = fn;
}

export function render(name: string, props: Record<string, string>): EmailPayload | null {
  const tpl = templates[name];
  if (!tpl) return null;
  const rendered = tpl(props);
  return {
    to: props.to,
    subject: props.subject,
    html: rendered.html,
    text: rendered.text,
  };
}
