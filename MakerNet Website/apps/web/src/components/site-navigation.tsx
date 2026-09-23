"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteNavigation() {
  const pathname = usePathname();
  return (
    <nav className="primary-nav" aria-label="Primary navigation">
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
        Home
      </Link>
      <Link
        href="/design-system"
        aria-current={pathname === "/design-system" ? "page" : undefined}
      >
        Design system
      </Link>
    </nav>
  );
}
