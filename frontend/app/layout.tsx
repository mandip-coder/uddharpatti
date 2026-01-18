import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter as requested (Google Fonts)
import "./globals.css";
import AuthCheck from "@/components/layout/AuthCheck";
import AppLayout from "@/components/layout/AppLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Uddhar Patti",
  description: "Multiplayer Card Game with Debt System",
};

import { SocketProvider } from "@/context/SocketContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthCheck>
          <SocketProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </SocketProvider>
        </AuthCheck>
      </body>
    </html>
  );
}
