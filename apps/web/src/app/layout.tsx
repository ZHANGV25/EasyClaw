import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ToastProvider } from "@/components/Toast";
import { ConversationsProvider } from "@/contexts/ConversationsContext";
import "./globals.css";

import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "EasyClaw — Your Private AI Assistant",
  description:
    "A private, always-on AI personal assistant. No setup required. Chat from your phone or Telegram.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: { colorPrimary: "#7c5cfc" },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} ${dmSerif.variable} font-sans antialiased`}>
          <ThemeProvider>
            <ToastProvider>
              <ConversationsProvider>
                {children}
              </ConversationsProvider>
            </ToastProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
