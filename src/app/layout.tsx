import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeProvider } from '@/hooks/use-theme';

export const metadata: Metadata = {
  title: 'Balança',
  description: 'Calculadora de Pesagem',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lato:wght@400;700&family=Nunito:wght@400;700&family=Open+Sans:wght@400;700&family=Poppins:wght@400;500;700&family=Roboto:wght@400;500;700&family=Montserrat:wght@400;700&family=Playfair+Display:wght@400;700&family=Raleway:wght@400;700&family=Bebas+Neue&family=Lobster&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
          <FirebaseClientProvider>
            {children}
          </FirebaseClientProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
