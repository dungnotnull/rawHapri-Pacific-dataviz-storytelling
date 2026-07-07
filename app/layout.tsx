import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tides of Debt - a Pacific climate story",
  description:
    "Pacific Island Countries emit the least, and stand to lose the most. A data story on emissions, sea level, and the cost still to come.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}