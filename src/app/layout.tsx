import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const NotoSansMono = localFont({
  src: "assets/NotoSansMono-VariableFont_wdth,wght.ttf",
  display: "swap",
  weight: "500 800",
});

export const metadata: Metadata = {
  title: "Catalyzer",
  description: "Catalyzer - yet another Cataclysm:DDA launcher.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={NotoSansMono.className}>
        <ThemeProvider themes={["light", "dark", "twilight"]} attribute="class" defaultTheme="twilight" enableSystem>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
