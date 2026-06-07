import 'server-only';

import type { EmailPayload } from './transport';
import { welcomeTemplate, verifyEmailTemplate, resetPasswordTemplate, magicLinkTemplate } from './templates/index';
import { passwordChangedTemplate } from './templates/password-changed';

type TemplateFn = (props: Record<string, string>) => { html: string; text: string };

const templates: Record<string, TemplateFn> = {
  welcome: (props) => welcomeTemplate({ name: props.name }),
  'verify-email': (props) => verifyEmailTemplate({ name: props.name, url: props.url }),
  'reset-password': (props) => resetPasswordTemplate({ name: props.name, url: props.url }),
  'magic-link': (props) => magicLinkTemplate({ name: props.name, url: props.url }),
  'password-changed': (props) => passwordChangedTemplate({ name: props.name }),
};

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
