import type { Metadata } from "next";
// import { Inter } from "next/font/google";
import localFont from 'next/font/local';
import "./globals.css";

import { cn } from "@/lib/utils";

// const inter = Inter({
//   subsets: ["latin"],
// });

const arboriaBook = localFont({
  src: './fonts/Arboria-Book.woff2',
  variable: '--font-arboria-book',
});

const arboriaBold = localFont({
  src: './fonts/Arboria-Bold.woff2',
  variable: '--font-arboria-bold',
});


export const metadata: Metadata = {
  title: "Co-PAWthor Canvas",
  description: "Canvas Chat UX by LangChain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-screen">
      <body className={cn(
        "min-h-full",
        arboriaBold.variable,
        arboriaBook.variable,
        "font-arboria-book"

      )}>{children}</body>
    </html>
  );
}
