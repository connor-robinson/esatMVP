import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment successful | ESATCAMP",
  robots: { index: false, follow: true },
};

export default function PricingSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
