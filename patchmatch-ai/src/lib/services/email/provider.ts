import "server-only";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  tags?: Record<string, string>;
}

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<{ id: string | null }>;
}

const from = () => process.env.EMAIL_FROM ?? "PatchMatch AI <hello@example.com>";

const consoleProvider: EmailProvider = {
  name: "console",
  async send(msg) {
    console.info(`[email:console] → ${msg.to} | ${msg.subject}`);
    return { id: null };
  },
};

const resendProvider: EmailProvider = {
  name: "resend",
  async send(msg) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: from(), to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text,
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        tags: msg.tags ? Object.entries(msg.tags).map(([name, value]) => ({ name, value })) : undefined,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { id?: string };
    return { id: json.id ?? null };
  },
};

const postmarkProvider: EmailProvider = {
  name: "postmark",
  async send(msg) {
    const res = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: { "X-Postmark-Server-Token": process.env.POSTMARK_SERVER_TOKEN ?? "", "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ From: from(), To: msg.to, Subject: msg.subject, HtmlBody: msg.html, TextBody: msg.text, ReplyTo: process.env.EMAIL_REPLY_TO || undefined, MessageStream: "outbound" }),
    });
    if (!res.ok) throw new Error(`Postmark ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { MessageID?: string };
    return { id: json.MessageID ?? null };
  },
};

export function emailProvider(): EmailProvider {
  switch (process.env.EMAIL_PROVIDER) {
    case "resend":
      return process.env.RESEND_API_KEY ? resendProvider : consoleProvider;
    case "postmark":
      return process.env.POSTMARK_SERVER_TOKEN ? postmarkProvider : consoleProvider;
    default:
      return consoleProvider;
  }
}
