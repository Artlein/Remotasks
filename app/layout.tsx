import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Remotasks Time Tracker | EQC Quality Assurance',
  description: 'Personal Time Tracking System for Remotasks EQC Quality Assurance Auditors',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="antialiased min-h-screen text-slate-100 selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
