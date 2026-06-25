import type { Metadata } from "next";
import { SessionProvider } from "../components/SessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Платформа Magic English",
  description: "Интерактивная платформа для изучения английского языка"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
