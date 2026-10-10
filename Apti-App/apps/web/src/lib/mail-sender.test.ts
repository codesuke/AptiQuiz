import { describe, expect, it, vi } from "vitest";
import { createMailSender } from "./mail-sender";

describe("createMailSender", () => {
  it("logs mail links in development when Gmail credentials are absent", async () => {
    const log = vi.fn();
    const sender = createMailSender({
      environment: "development",
      gmailAppPassword: undefined,
      gmailUser: undefined,
      log,
    });

    await sender.send({
      subject: "Verify your AptiQuiz email",
      text: "Open https://aptiquiz.test/api/auth/verify-email?token=example",
      to: "student@example.com",
    });

    expect(log).toHaveBeenCalledWith(
      "Auth email for student@example.com: Verify your AptiQuiz email\nOpen https://aptiquiz.test/api/auth/verify-email?token=example",
    );
  });

  it("rejects missing Gmail credentials outside development", () => {
    expect(() =>
      createMailSender({
        environment: "production",
        gmailAppPassword: undefined,
        gmailUser: undefined,
        log: vi.fn(),
      }),
    ).toThrow("Gmail credentials are required outside development");

    expect(() =>
      createMailSender({
        environment: "staging",
        gmailAppPassword: undefined,
        gmailUser: undefined,
        log: vi.fn(),
      }),
    ).toThrow("Gmail credentials are required outside development");
  });

  it("uses the injected transport when Gmail credentials are present", async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const sender = createMailSender({
      environment: "production",
      gmailAppPassword: "app-password",
      gmailUser: "mailer@example.com",
      log: vi.fn(),
      transport: { sendMail },
    });

    await sender.send({
      subject: "Verify your AptiQuiz email",
      text: "Open this link",
      to: "student@example.com",
    });

    expect(sendMail).toHaveBeenCalledWith({
      from: "mailer@example.com",
      subject: "Verify your AptiQuiz email",
      text: "Open this link",
      to: "student@example.com",
    });
  });
});
