import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Providers } from "./providers";
import Script from "next/script";

export const metadata: Metadata = {
  title: {
    default: "Kanban Cloud - Modern Agile Task Management Platform",
    template: "%s | Kanban Cloud",
  },
  description:
    "Modern cloud-native Kanban platform for Agile task management. Organize workflows with drag-and-drop columns, real-time analytics, WIP limits, and cloud persistence.",
  keywords: [
    "kanban cloud",
    "task management",
    "project management",
    "productivity tool",
    "cloud kanban",
    "drag and drop",
    "todo list",
    "agile board",
    "scrum board",
    "work management",
  ],
  authors: [{ name: "ShunyaPulse" }],
  creator: "ShunyaPulse",
  publisher: "ShunyaPulse",
  verification: {
    google: "dzEaDDFxL3oKEeOZkQJfq_g51jRyDFwH_Ou2XGkx_0Q",
  },
  openGraph: {
    title: "Kanban Cloud - Modern Agile Task Management Platform",
    description:
      "Organize your projects with a beautiful drag-and-drop Kanban board. Track progress, manage WIP limits, and boost productivity with real-time cloud persistence.",
    type: "website",
    locale: "en_US",
    siteName: "Kanban Cloud",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kanban Cloud - Modern Agile Task Management Platform",
    description:
      "Organize your projects with a beautiful drag-and-drop Kanban board with real-time metrics and cloud persistence.",
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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers>
        {children}
        <footer className="shrink-0 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4 sm:px-6 py-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-400">
            <p>&copy; {new Date().getFullYear()} Kanban Cloud by ShunyaPulse. All rights reserved.</p>
            <nav className="flex flex-wrap justify-center gap-4 sm:gap-6">
              <Link href="/" className="hover:text-slate-200 transition-colors">Home</Link>
              <Link href="/about" className="hover:text-slate-200 transition-colors">About</Link>
              <Link href="/privacy-policy" className="hover:text-slate-200 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-slate-200 transition-colors">Terms of Service</Link>
              <Link href="/contact" className="hover:text-slate-200 transition-colors">Contact</Link>
              <a href="https://github.com/ShunyaPulse/kanban-cloud" target="_blank" rel="noopener noreferrer" className="hover:text-slate-200 transition-colors">GitHub</a>
            </nav>
          </div>
        </footer>

        {/* Adsterra Social Bar */}
        <Script 
          src="https://pl31292005.profitableratecpmnetwork.com/4d/f2/2a/4df22ae1cef161197a583041e1593cd0.js" 
          strategy="afterInteractive" 
        />
        
        {/* Adsterra Pop Under */}
        <Script 
          src="https://pl31292004.profitableratecpmnetwork.com/ec/e7/6c/ece76ca482e275898579d4ac5ad5f0d8.js" 
          strategy="afterInteractive" 
        />
              </Providers>
      </body>
    </html>
  );
}


