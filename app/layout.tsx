import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Head from "next/head";
import { ClerkProvider } from "@clerk/nextjs";
import { AppContextProvider } from "@/context/AppContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <AppContextProvider>
        <html lang="en">
          <Head>
            <title>Deepseek Clone</title>
            <meta name="description" content="Full Stack Project" />
          </Head>
          <body className={`${inter.className} antialiased h-screen w-screen`}>
            <Toaster toastOptions={
              {
                success: {style: { background: "black", color: "white" }},
                error: {style: { background: "black", color: "white" }}
              }
            } />
            {children}</body>
        </html>
      </AppContextProvider>
    </ClerkProvider>
  );
}
