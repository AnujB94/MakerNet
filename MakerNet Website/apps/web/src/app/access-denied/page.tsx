import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <div className="container form-page">
      <p className="eyebrow">Access</p>
      <h1>Access denied</h1>
      <p>
        Your account cannot open this page. A college administrator can review
        your access.
      </p>
      <Link href="/">Return home</Link>
    </div>
  );
}
