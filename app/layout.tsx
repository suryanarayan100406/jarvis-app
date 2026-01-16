import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter as base, clean and modern.
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jarvis - The Vibe Check",
  description: "Next gen messaging for Gen Z.",
  manifest: "/manifest.json", // Setup for PWA later
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      {/* Enforcing dark mode by default for the 'vibe' */}
      <body className={cn(inter.className, "antialiased min-h-screen bg-background text-foreground")}>
        {children}
      </body>
    </html>
  );
}
