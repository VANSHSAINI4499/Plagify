import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { NeonGridBackground } from "@/components/NeonGridBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plagify | AI Code Quality & Plagiarism Checker UI",
  description:
    "Futuristic animated frontend for comparing code quality, plagiarism, and AST visualizations with Monaco editors and 3D embeddings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground`}
      >
        <NeonGridBackground />
        <div className="relative flex min-h-screen flex-col px-4 py-6 md:px-8">
          <Navbar />
          <main className="mx-auto w-full max-w-6xl flex-1 py-10">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
