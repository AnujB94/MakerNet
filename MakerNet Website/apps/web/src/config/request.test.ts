import { describe, expect, it } from "vitest";
import { requestId } from "./request";

describe("request correlation", () => {
  it("keeps a safe upstream identifier", () => {
    expect(
      requestId(
        new Request("http://localhost", {
          headers: { "x-request-id": "trace-123" },
        }),
      ),
    ).toBe("trace-123");
  });

  it("rejects header values that could corrupt structured logs", () => {
    const value = requestId(
      new Request("http://localhost", {
        headers: { "x-request-id": "unsafe space" },
      }),
    );
    expect(value).toMatch(/^[0-9a-f-]{36}$/);
  });
});
