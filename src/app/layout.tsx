import type { Metadata } from "next";
import { ThemeProvider } from 'next-themes'
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// import { M_PLUS_1_Code, Noto_Sans_Mono } from "next/font/google";
// export const m_plus_1_code = M_PLUS_1_Code({
//   subsets: ["latin"]
// });
// export const noto_sans_mono = Noto_Sans_Mono({
//   subsets: ["latin"]
// });

const NotoSansMono = localFont({
  src: "assets/NotoSansMono-VariableFont_wdth,wght.ttf",
  display: "swap",
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
      <body className={
        // noto_sans_mono.className
        NotoSansMono.className
        }>
        <ThemeProvider
          themes={["light", "dark", "yukari"]}
          attribute="class"
          defaultTheme="dark"
          enableSystem
        >
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
