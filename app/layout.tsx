import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from '@/providers/ToastProvider';

export const metadata: Metadata = {
  title: "Chúng Mình — Không gian riêng của hai người",
  description: "Ứng dụng dành riêng cho các cặp đôi — chia sẻ kỷ niệm, đếm ngày yêu và ghi lại những điều đặc biệt nhất.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
