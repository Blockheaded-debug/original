import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crypto Analyzer Pro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Toaster
          toastOptions={{
            // Semua toast akan menggunakan dark mode
            style: {
              background: '#333',
              color: '#fff',
              border: '1px solid #444',
            },
            success: {
              iconTheme: {
                primary: '#4ade80', // green
                secondary: '#1f2937', // dark gray
              },
            },
            error: {
              iconTheme: {
                primary: '#f87171', // red
                secondary: '#1f2937',
              },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
