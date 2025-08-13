import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AppContextProvider } from "@/context/AppContext";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "Deepseek Clone",
  description: "Full Stack Project",
} as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased h-screen w-screen">
          <AppContextProvider>
            <Toaster
              toastOptions={{
                success: { style: { background: "black", color: "white" } },
                error: { style: { background: "black", color: "white" } },
              }}
            />
            {children}
          </AppContextProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}