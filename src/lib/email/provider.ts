import "server-only";
import { sendViaSmtp, smtpAvailable, type EmailMessage } from "@/lib/email/smtp";

export type { EmailMessage } from "@/lib/email/smtp";

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    const body = message.text ?? stripHtml(message.html ?? "");
    console.log(
      `[email:console] -> ${message.to}\nsubject: ${message.subject}\nbody: ${body.slice(0, 500)}`
    );
  }
}

class SmtpEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    await sendViaSmtp(message);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const provider: EmailProvider = smtpAvailable()
  ? new SmtpEmailProvider()
  : new ConsoleEmailProvider();

export function getEmailProvider(): EmailProvider {
  return provider;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await getEmailProvider().send(message);
}