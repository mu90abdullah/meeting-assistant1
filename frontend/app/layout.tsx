import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import MeshBackground from "./components/MeshBackground";

export const metadata: Metadata = {
  title: "مساعد الاجتماعات — AI Meeting Assistant",
  description: "فرّغ، لخّص، وأرسل ملخص اجتماعك بريدياً في دقائق باستخدام الذكاء الاصطناعي.",
  keywords: ["meeting assistant", "Arabic transcription", "AI summary", "Whisper", "Groq"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
