import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ToastProvider } from "@/components/Toast";
import { ConversationsProvider } from "@/contexts/ConversationsContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <html lang="en" className="dark">
        <body className={inter.className}>
          <ToastProvider>
            <ConversationsProvider>
              {children}
            </ConversationsProvider>
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
