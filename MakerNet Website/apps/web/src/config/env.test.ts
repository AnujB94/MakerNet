import { describe, expect, it } from "vitest";
import { parseServerEnvironment } from "./env";

const complete = {
  APP_ENV: "test",
  DATABASE_URL: "postgresql://user:password@localhost:5432/makernet",
  OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
  OBJECT_STORAGE_ACCESS_KEY: "access",
  OBJECT_STORAGE_SECRET_KEY: "secret",
  SMTP_URL: "smtp://localhost:1025",
};

describe("server configuration", () => {
  it("rejects a missing required setting without printing its value", () => {
    expect(() =>
      parseServerEnvironment({ ...complete, DATABASE_URL: undefined }),
    ).toThrow("Missing required configuration: DATABASE_URL");
  });

  it("rejects an HTTP database endpoint", () => {
    expect(() =>
      parseServerEnvironment({
        ...complete,
        DATABASE_URL: "http://example.test",
      }),
    ).toThrow("Invalid protocol in configuration: DATABASE_URL");
  });

  it("accepts a complete configuration and uses safe version defaults", () => {
    const env = parseServerEnvironment(complete);
    expect(env.appEnv).toBe("test");
    expect(env.appVersion).toBe("0.1.0-dev");
    expect(env.buildCommit).toBe("local");
  });

  it("requires a canonical HTTPS origin for production cookies and callbacks", () => {
    expect(() =>
      parseServerEnvironment({ ...complete, APP_ENV: "production" }),
    ).toThrow(/Production APP_ORIGIN/);
    expect(() =>
      parseServerEnvironment({
        ...complete,
        APP_ENV: "production",
        APP_ORIGIN: "http://example.test",
      }),
    ).toThrow(/Production APP_ORIGIN/);
    expect(() =>
      parseServerEnvironment({
        ...complete,
        APP_ORIGIN: "https://example.test/path",
      }),
    ).toThrow(/APP_ORIGIN must be an origin/);
    expect(
      parseServerEnvironment({
        ...complete,
        APP_ENV: "production",
        APP_ORIGIN: "https://example.test",
      }).appOrigin,
    ).toBe("https://example.test");
  });
});
