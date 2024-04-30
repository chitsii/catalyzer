import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { M_PLUS_1_Code, Noto_Sans_Mono } from "next/font/google";

import "./globals.css";

// const inter = Inter({ subsets: ["latin"] });

export const m_plus_1_code = M_PLUS_1_Code({
  subsets: ["latin"]
});
export const noto_sans_mono = Noto_Sans_Mono({
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Cataclysm Launcher",
  description: "Cataclysm: Dark Days Ahead Launcher",
};

export default function RootLayout(
  { children, }: Readonly<{ children: React.ReactNode; }>
) {
  return (
    <html
      lang="ja"
      className="dark"
    >
      <body className={noto_sans_mono.className}>{children}</body>
    </html>
  );
}
