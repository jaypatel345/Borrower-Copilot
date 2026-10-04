import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Borrower Copilot — know what you can safely borrow",
  description:
    "A free loan self-assessment for Indian borrowers: should you borrow, how much you can safely carry, a fair interest rate, and the EMI to hold the line at.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
