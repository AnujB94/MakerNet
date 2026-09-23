import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
