// Phase 3 — Stream 3B: Email transport.
//
// Env-driven transport: Resend in production, ConsoleTransport in dev.
// During 3B, the ConsoleTransport logs rendered emails to stdout.
// 3K adds DMARC/SPF verification and bounce handling.

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailTransport {
  send(payload: EmailPayload): Promise<{ ok: boolean; error?: string }>;
}

class ConsoleTransport implements EmailTransport {
  async send(payload: EmailPayload) {
    const line = "-".repeat(60);
    console.log(`\n${line}`);
    console.log(`[EMAIL] TO:      ${payload.to}`);
    console.log(`[EMAIL] SUBJECT: ${payload.subject}`);
    console.log(`[EMAIL] TEXT:    ${payload.text.slice(0, 200)}${payload.text.length > 200 ? "..." : ""}`);
    console.log(`${line}\n`);
    return { ok: true };
  }
}

class ResendTransport implements EmailTransport {
  private apiKey: string;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
  }

  async send(payload: EmailPayload) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body };
    }
    return { ok: true };
  }
}

function createTransport(): EmailTransport {
  if (process.env.RESEND_API_KEY) {
    return new ResendTransport(
      process.env.RESEND_API_KEY,
      process.env.RESEND_FROM ?? "Rejira <noreply@rejira.app>",
    );
  }
  return new ConsoleTransport();
}

export const transport = createTransport();
