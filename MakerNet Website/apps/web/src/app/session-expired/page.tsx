import Link from "next/link";

export default function SessionExpiredPage() {
  return (
    <div className="container form-page">
      <p className="eyebrow">Session</p>
      <h1>Your session has ended</h1>
      <p>Sign in again to continue your work.</p>
      <Link href="/sign-in">Sign in</Link>
    </div>
  );
}
