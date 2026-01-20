import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Question Review",
  description: "Review and approve AI-generated questions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-white antialiased">
        {children}
      </body>
    </html>
  );
}

