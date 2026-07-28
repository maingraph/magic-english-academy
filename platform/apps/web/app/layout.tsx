import type { Metadata } from "next";
import { SessionProvider } from "../components/SessionProvider";
import { PwaRegister } from "../components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Платформа Magic English",
  description: "Интерактивная платформа для изучения английского языка",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Magic English"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <SessionProvider>
          <PwaRegister />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
