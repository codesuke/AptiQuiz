export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface MailSender {
  send(message: MailMessage): Promise<void>;
}

export interface MailTransport {
  sendMail(message: MailMessage & { from: string }): Promise<void>;
}

interface MailSenderOptions {
  environment: string | undefined;
  gmailUser: string | undefined;
  gmailAppPassword: string | undefined;
  log(message: string): void;
  transport?: MailTransport;
}

const consoleMailEnvironments = new Set(["development", "test"]);

export function createMailSender(options: MailSenderOptions): MailSender {
  if (!options.gmailUser || !options.gmailAppPassword) {
    if (consoleMailEnvironments.has(options.environment ?? "")) {
      return {
        async send(message) {
          options.log(`Auth email for ${message.to}: ${message.subject}\n${message.text}`);
        },
      };
    }

    throw new Error("Gmail credentials are required outside development");
  }

  const transport = options.transport;
  const from = options.gmailUser;
  if (!transport || !from) {
    throw new Error("Gmail transport has not been configured");
  }

  return {
    send(message) {
      return transport.sendMail({ ...message, from });
    },
  };
}

import nodemailer from "nodemailer";

export function createGmailMailSender(options: Omit<MailSenderOptions, "transport">): MailSender {
  const { gmailUser, gmailAppPassword } = options;
  if (Boolean(gmailUser) !== Boolean(gmailAppPassword)) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set together");
  }

  const transport =
    gmailUser && gmailAppPassword
      ? nodemailer.createTransport({
          auth: { pass: gmailAppPassword, user: gmailUser },
          service: "gmail",
        })
      : undefined;

  return createMailSender({
    ...options,
    transport: transport
      ? { sendMail: async (message) => void (await transport.sendMail(message)) }
      : undefined,
  });
}
