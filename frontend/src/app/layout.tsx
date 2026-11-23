import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Analytics } from "@/components/Analytics";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const SITE_NAME = "CopyLekha";
const DESCRIPTION = "CopyLekha: copywork practice for IELTS Academic Writing";

// With the site's address set, links in the metadata (such as the share image) are absolute.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: SITE_NAME,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DESCRIPTION,
  },
};

// suppressHydrationWarning: next-themes sets the theme class on <html> before React loads,
// so that one element differs from the built HTML on purpose.
const RootLayout = ({ children }: LayoutProps<"/">) => (
  <html
    lang="en"
    className={`${inter.variable} h-full font-sans antialiased`}
    suppressHydrationWarning
  >
    <body className="flex min-h-full flex-col">
      <ThemeProvider>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
      <Analytics />
    </body>
  </html>
);

export default RootLayout;
