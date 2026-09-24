import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { serverEnvironment } from "@/config/env";

let transporter: Transporter | undefined;

function mailer() {
  const env = serverEnvironment();
  transporter ??= nodemailer.createTransport(env.smtpUrl);
  return transporter;
}

export async function sendSignInEmail(
  email: string,
  token: string,
  origin: URL,
): Promise<void> {
  const env = serverEnvironment();
  const link = new URL("/auth/email/verify", origin);
  link.searchParams.set("token", token);
  await mailer().sendMail({
    from: env.emailFrom,
    to: email,
    subject: "Your MakerNet sign-in link",
    text: [
      "Use this link to sign in to MakerNet:",
      "",
      link.href,
      "",
      "The link expires in 15 minutes and works once. If you did not request it, ignore this email.",
    ].join("\n"),
    html: `<p>Use this link to sign in to MakerNet:</p><p><a href="${link.href}">Sign in to MakerNet</a></p><p>This link expires in 15 minutes and works once. If you did not request it, ignore this email.</p>`,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}
