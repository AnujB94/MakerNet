import type { Metadata } from "next";
import Link from "next/link";
import { SiteNavigation } from "@/components/site-navigation";
import { AccountMenu } from "@/components/account-menu";
import "./globals.css";

export const metadata: Metadata = {
  title: "MakerNet",
  description: "Campus makers and practical knowledge in one place",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header className="site-header">
          <div className="container site-header-inner">
            <Link className="brand" href="/" aria-label="MakerNet home">
              Maker<span className="brand-mark">Net</span>
            </Link>
            <SiteNavigation />
            <AccountMenu />
          </div>
        </header>
        <main className="site-main" id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <div className="container site-footer-inner">
            <span>MakerNet · A place for campus making</span>
            <span>Built for useful work and shared knowledge</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
