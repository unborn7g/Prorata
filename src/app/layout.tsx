import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prorata — Split the meter fairly",
  description:
    "Split prepaid electricity meter top-ups fairly among flatmates by equal share, days present, or days times appliance weight.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
