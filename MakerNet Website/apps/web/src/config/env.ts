export type AppEnvironment = "local" | "test" | "staging" | "production";

export interface ServerEnvironment {
  appEnv: AppEnvironment;
  databaseUrl: string;
  objectStorageEndpoint: string;
  objectStorageAccessKey: string;
  objectStorageSecretKey: string;
  smtpUrl: string;
  appVersion: string;
  buildCommit: string;
}

const environments = new Set<AppEnvironment>([
  "local",
  "test",
  "staging",
  "production",
]);

type EnvironmentSource = Record<string, string | undefined>;

function required(source: EnvironmentSource, name: string): string {
  const value = source[name]?.trim();
  if (!value) throw new Error(`Missing required configuration: ${name}`);
  return value;
}

function validUrl(value: string, name: string, protocols: string[]): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid URL in configuration: ${name}`);
  }
  if (!protocols.includes(url.protocol)) {
    throw new Error(`Invalid protocol in configuration: ${name}`);
  }
  return value;
}

export function parseServerEnvironment(
  source: EnvironmentSource,
): ServerEnvironment {
  const appEnv = required(source, "APP_ENV");
  if (!environments.has(appEnv as AppEnvironment)) {
    throw new Error("Invalid configuration: APP_ENV");
  }
  return {
    appEnv: appEnv as AppEnvironment,
    databaseUrl: validUrl(required(source, "DATABASE_URL"), "DATABASE_URL", [
      "postgres:",
      "postgresql:",
    ]),
    objectStorageEndpoint: validUrl(
      required(source, "OBJECT_STORAGE_ENDPOINT"),
      "OBJECT_STORAGE_ENDPOINT",
      ["http:", "https:"],
    ),
    objectStorageAccessKey: required(source, "OBJECT_STORAGE_ACCESS_KEY"),
    objectStorageSecretKey: required(source, "OBJECT_STORAGE_SECRET_KEY"),
    smtpUrl: validUrl(required(source, "SMTP_URL"), "SMTP_URL", [
      "smtp:",
      "smtps:",
    ]),
    appVersion: source.APP_VERSION?.trim() || "0.1.0-dev",
    buildCommit: source.BUILD_COMMIT?.trim() || "local",
  };
}

let cached: ServerEnvironment | undefined;

export function serverEnvironment(): ServerEnvironment {
  cached ??= parseServerEnvironment(process.env);
  return cached;
}
