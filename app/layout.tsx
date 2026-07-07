import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Magyar Mail — Hungarian Business Email Assistant",
  description: "Analyze, translate, and reply to Hungarian business emails with AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu">
      <body suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
