"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Account = {
  signedIn: boolean;
  displayName?: string;
  administrator?: boolean;
  moderator?: boolean;
};

export function AccountMenu() {
  const [account, setAccount] = useState<Account | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<Account>)
          : { signedIn: false },
      )
      .then(setAccount)
      .catch(() => setAccount({ signedIn: false }));
    return () => controller.abort();
  }, []);
  if (!account)
    return (
      <div className="account-location" aria-label="Account area">
        Loading account
      </div>
    );
  if (!account.signedIn)
    return (
      <div className="account-location" aria-label="Account area">
        <Link href="/sign-in">Sign in</Link>
      </div>
    );
  return (
    <div className="account-location" aria-label="Account area">
      <details className="account-disclosure">
        <summary>{account.displayName || "Account"}</summary>
        <div className="account-links">
          <Link href="/settings">Settings</Link>
          <Link href="/members/me">My profile</Link>
          {account.moderator && <Link href="/admin/skills">Manage skills</Link>}
          {account.administrator && (
            <Link href="/admin/audit">Audit history</Link>
          )}
          {account.administrator && (
            <Link href="/admin/access">Access control</Link>
          )}
          <form action="/auth/logout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </details>
    </div>
  );
}
