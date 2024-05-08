import type { Metadata } from "next";
import { ThemeProvider } from 'next-themes';
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import CSR from "@/components/csr/csr";
import "./globals.css";

const NotoSansMono = localFont({
  src: "assets/NotoSansMono-VariableFont_wdth,wght.ttf",
  display: "swap",
  weight: "500 800",
});

export const metadata: Metadata = {
  title: "Cataclysm Launcher",
  description: "Cataclysm: Dark Days Ahead Launcher",
};

export default function RootLayout(
  { children, }: Readonly<{ children: React.ReactNode; }>
) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={NotoSansMono.className}>
        <ThemeProvider
          themes={["light", "dark", "yukari"]}
          attribute="class"
          defaultTheme="dark"
          enableSystem
        >
          <CSR>
          {children}
          </CSR>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
