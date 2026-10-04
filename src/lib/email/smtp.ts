import "server-only";
import { connect as tcpConnect } from "net";
import { connect as tlsConnect } from "tls";
import { env } from "@/config/env";

export type EmailMessage = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  /** Display name used for the `From:` header when EMAIL_FROM is unset. */
  fromName?: string;
};

export function smtpAvailable(): boolean {
  return Boolean(env.EMAIL_SERVER_HOST?.trim());
}

const CRLF = "\r\n";

function encodeHeader(value: string): string {
  return /[^\x00-\x7F]/.test(value)
    ? `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`
    : value;
}

function buildMessage(message: EmailMessage, from: string): string {
  const boundary = `----=_snigdha_${Math.random().toString(36).slice(2)}`;
  const headers = [
    `From: ${encodeHeader(from)}`,
    `To: ${encodeHeader(message.to)}`,
    `Subject: ${encodeHeader(message.subject)}`,
    "MIME-Version: 1.0",
    "Date: " + new Date().toUTCString(),
  ];
  const hasHtml = Boolean(message.html);
  const hasText = Boolean(message.text);
  let body = "";
  if (hasHtml && hasText) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    body = [
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      message.text ?? "",
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      message.html ?? "",
      `--${boundary}--`,
    ].join(CRLF);
  } else if (hasHtml) {
    headers.push("Content-Type: text/html; charset=UTF-8");
    body = message.html ?? "";
  } else {
    headers.push("Content-Type: text/plain; charset=UTF-8");
    body = message.text ?? "";
  }
  return headers.join(CRLF) + CRLF + CRLF + body;
}

type Reply = { code: number; lines: string[] };

export async function sendViaSmtp(message: EmailMessage): Promise<void> {
  const host = env.EMAIL_SERVER_HOST?.trim();
  if (!host) {
    throw new Error("SMTP is not configured (EMAIL_SERVER_HOST is empty).");
  }
  const port = Number(env.EMAIL_SERVER_PORT ?? "587") || 587;
  const user = env.EMAIL_SERVER_USER ?? "";
  const password = env.EMAIL_SERVER_PASSWORD ?? "";
  const from = env.EMAIL_FROM ?? `${message.fromName ?? "Store"} <no-reply@localhost>`;
  const useTls = port === 465;

  const transport = tcpConnect({ host, port, timeout: 30_000 });
  let stream = transport;
  let buffer = "";
  const waiting: Array<{
    resolve: (reply: Reply) => void;
    reject: (err: Error) => void;
  }> = [];
  let failed = false;

  function rejectWaiting(err: Error) {
    for (const w of waiting.splice(0)) w.reject(err);
  }

  transport.on("error", (err) => {
    failed = true;
    rejectWaiting(err);
  });
  transport.on("timeout", () => rejectWaiting(new Error("SMTP connection timed out.")));

  const onStreamData = (chunk: string) => handleChunk(chunk);
  let attached: NodeJS.Socket | null = null;

  function attachData(s: NodeJS.Socket) {
    if (attached === s) return;
    if (attached) attached.off("data", onStreamData);
    s.on("data", onStreamData);
    attached = s;
  }
  attachData(transport);

  function handleChunk(chunk: string) {
    buffer += chunk;
    let match: RegExpExecArray | null;
    while ((match = /(^|\r\n)(\d{3} )/.exec(buffer)) !== null) {
      const start = match.index + match[1].length;
      const end = buffer.indexOf("\r\n", start + 4);
      if (end === -1) break;
      const raw = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const lines = raw.split(/\r\n/);
      const code = Number(lines[0].slice(0, 3));
      const reply: Reply = { code, lines: [] };
      for (const line of lines) {
        const parsed = /^\d{3}[- ](.+)$/.exec(line);
        if (parsed) reply.lines.push(parsed[1]);
      }
      const w = waiting.shift();
      if (w) w.resolve(reply);
    }
  }

  function nextReply(): Promise<Reply> {
    return new Promise((resolve, reject) => {
      waiting.push({ resolve, reject });
    });
  }

  function send(data: string) {
    if (failed) throw new Error("SMTP connection lost.");
    stream.write(data + CRLF);
  }

  async function command(cmd: string, expected: number[]): Promise<Reply> {
    send(cmd);
    const reply = await nextReply();
    if (!expected.includes(reply.code)) {
      throw new Error(
        `SMTP ${cmd.split(" ")[0]} failed: ${reply.code} ${reply.lines.join(" ")}`
      );
    }
    return reply;
  }

  try {
    const greeting = await nextReply();
    if (greeting.code !== 220) {
      throw new Error(`SMTP greeting failed: ${greeting.code}`);
    }

    const ehlo = await command("EHLO localhost", [250]);
    const capabilities = ehlo.lines.join("\n").toUpperCase();

    if (!useTls && capabilities.includes("STARTTLS")) {
      await command("STARTTLS", [220]);
      const tlsSocket = tlsConnect({ socket: transport, host, servername: host });
      stream = tlsSocket;
      attachData(tlsSocket);
      tlsSocket.on("error", (err) => {
        failed = true;
        rejectWaiting(err);
      });
      await new Promise<void>((resolve, reject) => {
        tlsSocket.once("secureConnect", () => resolve());
        tlsSocket.once("error", reject);
      });
      await command("EHLO localhost", [250]);
    }

    if (user) {
      await command("AUTH LOGIN", [334]);
      send(Buffer.from(user, "utf8").toString("base64"));
      const userReply = await nextReply();
      if (userReply.code !== 334) throw new Error(`SMTP AUTH failed: ${userReply.code}`);
      send(Buffer.from(password, "utf8").toString("base64"));
      const authReply = await nextReply();
      if (authReply.code !== 235) throw new Error(`SMTP AUTH failed: ${authReply.code}`);
    }

    await command(`MAIL FROM:<${extractAddress(from)}>`, [250]);
    await command(`RCPT TO:<${extractAddress(message.to)}>`, [250, 251]);
    await command("DATA", [354]);

    if (failed) throw new Error("SMTP connection lost.");

    const mime = buildMessage(message, from);
    stream.write(mime + CRLF + "." + CRLF);
    const dataReply = await nextReply();
    if (dataReply.code !== 250) {
      throw new Error(`SMTP DATA failed: ${dataReply.code} ${dataReply.lines.join(" ")}`);
    }
  } finally {
    failed = true;
    try {
      stream.write(`QUIT${CRLF}`);
    } catch {
      /* noop */
    }
    transport.end();
  }
}

function extractAddress(address: string): string {
  const match = /<([^>]+)>/.exec(address);
  return (match?.[1] ?? address).trim();
}
