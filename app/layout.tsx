import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A Pacific climate story",
  description:
    "Pacific Island Countries emit the least, and stand to lose the most. An interactive data story on emissions, sea level, and the cost still to come.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  keywords: [
    "climate change",
    "pacific islands",
    "emissions",
    "sea level rise",
    "data visualization",
    "interactive story",
    "global warming",
    "carbon footprint",
    "Pacific Data Hub"
  ],
  authors: [{ name: "Hapri Vietnam Team" }],
  creator: "Hapri Vietnam Team",
  publisher: "Hapri Vietnam Team",
  openGraph: {
    title: "A Pacific climate story",
    description: "Pacific Island Countries emit the least, and stand to lose the most. Explore this interactive data story on emissions, sea levels, and climate impact.",
    url: "https://pacific-climate.vercel.app",
    siteName: "A Pacific climate story",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "A Pacific climate story",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "A Pacific climate story",
    description: "Pacific Island Countries emit the least, and stand to lose the most. Explore this interactive data story on emissions, sea levels, and climate impact.",
    creator: "@HapriVietnamTeam",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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