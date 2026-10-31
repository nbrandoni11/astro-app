import type { Metadata } from 'next';
import { Inter, DM_Serif_Display } from 'next/font/google';
import './globals.css';
import SupportAssistant from '@/components/SupportAssistant';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ID Astral — Tu horóscopo personal, cada día',
  description:
    'Tu horóscopo personal: una herramienta para cada día. Precisión astrológica e interpretación personalizada en WhatsApp, en el horario que elijas.',
  icons: { icon: '/id-astral-favicon.png', shortcut: '/id-astral-favicon.png', apple: '/id-astral-mark.png' },
  keywords: 'astrología, horóscopo, carta natal, personalizado, WhatsApp',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${inter.variable} ${dmSerif.variable}`}>
      <body>
        <main className="main-container">
          {children}
        </main>
        <SupportAssistant />
      </body>
    </html>
  );
}
