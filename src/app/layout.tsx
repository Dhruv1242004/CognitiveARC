import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CognitiveARC — Autonomous AI Agent Platform",
  description:
    "CognitiveARC is an observable AI agent orchestration platform with retrieval grounding, execution trace visibility, tool routing, and deployable systems architecture.",
  openGraph: {
    title: "CognitiveARC — Autonomous AI Agent Platform",
    description:
      "An architecture-first AI agent platform showing planning, retrieval, memory, tool execution, grounded response generation, and deployable infra readiness.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${plusJakarta.variable} antialiased`}
      >
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
