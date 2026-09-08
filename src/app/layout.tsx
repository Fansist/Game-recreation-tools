import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WorldForge — 1600+ MCP Tools to Build 3D Worlds Like GTA6",
  description:
    "WorldForge is a Model Context Protocol (MCP) server that exposes 1600+ tools for building 3D world sandbox and story games like GTA6. Fully compatible with Claude Code and Claude Desktop. Characters, vehicles, buildings, physics, AI, story, audio, and more.",
  keywords: [
    "WorldForge",
    "MCP",
    "Claude Code",
    "Claude Desktop",
    "3D games",
    "GTA",
    "game development",
    "AI tools",
    "sandbox",
    "Model Context Protocol",
  ],
  authors: [{ name: "WorldForge" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "WorldForge — 600+ MCP Tools to Build 3D Worlds",
    description:
      "Build 3D world sandbox and story games like GTA6 with 600+ MCP tools, compatible with Claude Code and Claude Desktop.",
    url: "https://chat.z.ai",
    siteName: "WorldForge",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WorldForge — 600+ MCP Tools",
    description: "Build 3D world sandbox and story games like GTA6 with 600+ MCP tools.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
