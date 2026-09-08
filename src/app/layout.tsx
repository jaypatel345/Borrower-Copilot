import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Borrower Copilot",
  description:
    "A borrower-side self-assessment: should you borrow, how much, at what rate, and what EMI to agree to.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto min-h-screen max-w-screen bg-paper px-5 py-6">
          {children}
        </div>
      </body>
    </html>
  );
}
