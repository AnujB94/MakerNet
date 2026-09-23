export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ serverEnvironment }, { logEvent }] = await Promise.all([
      import("./config/env"),
      import("./config/log"),
    ]);
    const config = serverEnvironment();
    logEvent("info", "startup", {
      environment: config.appEnv,
      version: config.appVersion,
      commit: config.buildCommit,
    });
  }
}
