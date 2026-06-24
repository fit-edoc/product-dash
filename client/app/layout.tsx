import { Metadata } from 'next';
import "./globals.css";

export const metadata: Metadata = {
  title: "Premium Product Showcase & Cache Center",
  description: "High-performance product showcase featuring Upstash Redis caching telemetry and automatic live updates.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
