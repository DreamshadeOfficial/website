import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'PausaLoop',
  description: 'Lunch break assistant'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        <main className="mx-auto max-w-4xl p-4">{children}</main>
      </body>
    </html>
  );
}