import { randomUUID } from "node:crypto";

export function requestId(request: Request): string {
  const supplied = request.headers.get("x-request-id");
  if (supplied && /^[a-zA-Z0-9-]{1,64}$/.test(supplied)) return supplied;
  return randomUUID();
}
