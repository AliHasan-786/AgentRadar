import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TopNav } from "@/components/TopNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://agent-radar-one.vercel.app"),
  title: "AgentRadar — see your store through AI shoppers' eyes",
  description:
    "Real LLMs run against any Shopify catalog. Read the transcripts, get a 0–100 AI readiness score, and see the actions ranked by leverage.",
  openGraph: {
    title: "AgentRadar — see your store through AI shoppers' eyes",
    description:
      "Five real LLMs from five distinct providers run against any Shopify catalog and show the literal transcripts.",
    url: "https://agent-radar-one.vercel.app",
    siteName: "AgentRadar",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentRadar — see your store through AI shoppers' eyes",
    description:
      "Five real LLMs from five distinct providers run against any Shopify catalog and show the literal transcripts.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TopNav />
        {children}
      </body>
    </html>
  );
}
