import { serverEnvironment } from "@/config/env";
import type { IdentityClaims } from "./service";

export function safeReturnTo(value: string | null): string {
  return value && /^\/(?!\/)[^\\\r\n]*$/.test(value) ? value : "/";
}

export function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || /[\s\r\n]/.test(email))
    return null;
  const at = email.lastIndexOf("@");
  if (at < 1 || at > 64 || at !== email.indexOf("@")) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)
  )
    return null;
  const labels = domain.split(".");
  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        !label ||
        label.length > 63 ||
        !/^[a-z0-9-]+$/i.test(label) ||
        label.startsWith("-") ||
        label.endsWith("-"),
    )
  )
    return null;
  return email;
}

export function emailIdentity(email: string): IdentityClaims {
  const normalized = normalizeEmail(email);
  if (!normalized) throw new Error("Invalid email address");
  const local = normalized.slice(0, normalized.indexOf("@"));
  return {
    issuer: "urn:makernet:verified-email",
    subject: normalized,
    email: normalized,
    displayName: local.slice(0, 100),
  };
}

export function developmentIdentity(
  handle: string,
  requestUrl: URL,
): IdentityClaims {
  const env = serverEnvironment();
  if (env.appEnv !== "local" && env.appEnv !== "test")
    throw new Error("Development login disabled");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(requestUrl.hostname))
    throw new Error("Development login requires loopback");
  const subject = handle.trim().toLowerCase();
  if (!/^[a-z][a-z0-9._-]{2,31}$/.test(subject))
    throw new Error("Invalid local account name");
  return {
    issuer: "urn:makernet:local-development",
    subject,
    email: `${subject}@local.makernet.invalid`,
    displayName: subject,
  };
}
