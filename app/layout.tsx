import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AppContextProvider } from "@/context/AppContext";

export const metadata: Metadata = {
  title: "Deepseek Clone",
  description: "AI chat app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en">
        <body className="bg-[#0f1115] text-white antialiased">
          <AppContextProvider>
            {children}
            <Toaster position="top-right" />
          </AppContextProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}