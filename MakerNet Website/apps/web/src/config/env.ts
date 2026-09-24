export type AppEnvironment = "local" | "test" | "staging" | "production";

export interface ServerEnvironment {
  appEnv: AppEnvironment;
  databaseUrl: string;
  objectStorageEndpoint?: string;
  objectStorageAccessKey?: string;
  objectStorageSecretKey?: string;
  smtpUrl: string;
  emailFrom: string;
  appVersion: string;
  buildCommit: string;
  appOrigin?: string;
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
  const appOrigin = source.APP_ORIGIN?.trim();
  if (appOrigin) {
    const parsed = new URL(
      validUrl(appOrigin, "APP_ORIGIN", ["http:", "https:"]),
    );
    if (
      parsed.origin !== appOrigin ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    )
      throw new Error(
        "APP_ORIGIN must be an origin without a path or trailing slash",
      );
  }
  if (
    appEnv === "production" &&
    (!appOrigin || !appOrigin.startsWith("https://"))
  )
    throw new Error("Production APP_ORIGIN must use HTTPS");
  const objectStorageEndpoint = source.OBJECT_STORAGE_ENDPOINT?.trim();
  const objectStorageAccessKey = source.OBJECT_STORAGE_ACCESS_KEY?.trim();
  const objectStorageSecretKey = source.OBJECT_STORAGE_SECRET_KEY?.trim();
  const objectStorageValues = [
    objectStorageEndpoint,
    objectStorageAccessKey,
    objectStorageSecretKey,
  ];
  if (
    objectStorageValues.some(Boolean) &&
    !objectStorageValues.every(Boolean)
  ) {
    throw new Error("Object storage configuration must be complete");
  }
  return {
    appEnv: appEnv as AppEnvironment,
    databaseUrl: validUrl(required(source, "DATABASE_URL"), "DATABASE_URL", [
      "postgres:",
      "postgresql:",
    ]),
    objectStorageEndpoint: objectStorageEndpoint
      ? validUrl(objectStorageEndpoint, "OBJECT_STORAGE_ENDPOINT", [
          "http:",
          "https:",
        ])
      : undefined,
    objectStorageAccessKey,
    objectStorageSecretKey,
    smtpUrl: validUrl(required(source, "SMTP_URL"), "SMTP_URL", [
      "smtp:",
      "smtps:",
    ]),
    emailFrom: required(source, "EMAIL_FROM"),
    appVersion: source.APP_VERSION?.trim() || "0.1.0-dev",
    buildCommit: source.BUILD_COMMIT?.trim() || "local",
    appOrigin: appOrigin || undefined,
  };
}

let cached: ServerEnvironment | undefined;

export function serverEnvironment(): ServerEnvironment {
  cached ??= parseServerEnvironment(process.env);
  return cached;
}
