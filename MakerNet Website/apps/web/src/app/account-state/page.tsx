import Link from "next/link";

export default function AccountStatePage() {
  return (
    <div className="container form-page">
      <p className="eyebrow">Account</p>
      <h1>Account access paused</h1>
      <p>
        Your college account is not currently eligible for MakerNet. Contact a
        college administrator for help.
      </p>
      <Link href="/">Return home</Link>
    </div>
  );
}
