import type { Metadata } from "next";
import localFont from "next/font/local";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import "./globals.css";
import ConvexClerkProvider from "@/components/providers/ConvexClerkProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "react-hot-toast";
import MissingEnvSetup from "@/components/MissingEnvSetup";
import { getMissingEnvVars } from "@/lib/env";
import AppShell from "@/components/AppShell";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "BECARTHAI TalentVision",
  description:
    "Interview management and video evaluation platform for BECARTH.AI Consulting.",
};
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const missingEnvVars = getMissingEnvVars();
  const isConfigured = missingEnvVars.length === 0;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {isConfigured ? (
            <ConvexClerkProvider>
              <AppShell>{children}</AppShell>
            </ConvexClerkProvider>
          ) : (
            <MissingEnvSetup missingEnvVars={missingEnvVars} />
          )}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
