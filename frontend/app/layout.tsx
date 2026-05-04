import type { Metadata } from "next";
import "./globals.css";
import CursorTrail from "./components/CursorTrail";

export const metadata: Metadata = {
  title: "Meeting Assistant — تحويل الاجتماعات إلى رؤى",
  description: "مساعد الاجتماعات الذكي: فرّغ، لخّص، وأرسل ملخص اجتماعك بريدياً في دقائق باستخدام الذكاء الاصطناعي.",
  keywords: ["meeting assistant", "Arabic transcription", "AI summary", "Whisper", "Groq"],
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" data-theme="dark">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Cairo:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <CursorTrail />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
