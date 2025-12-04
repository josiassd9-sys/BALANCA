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
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Arvo&family=Bebas+Neue&family=Bitter&family=Caveat&family=Changa+One&family=Cormorant+Garamond&family=Crimson+Text&family=Dancing+Script&familye=EB+Garamond&family=Exo+2&family=Fira+Sans&family=Great+Vibes&family=Inter:wght@400;500;600;700&family=Kaushan+Script&family=Lato:wght@400;700&family=Lobster&family=Lora&family=Merriweather&family=Montserrat:wght@400;700&family=Nunito:wght@400;700&family=Open+Sans:wght@400;700&family=Oswald&family=PT+Sans&family=PT+Serif&family=Pacifico&family=Passion+One&family=Playfair+Display:wght@400;700&family=Poppins:wght@400;500;700&family=Press+Start+2P&family=Quicksand&family=Raleway:wght@400;700&family=Righteous&family=Roboto:wght@400;500;700&family=Roboto+Slab&family=Rock+Salt&family=Russo+One&family=Satisfy&family=Shadows+Into+Light&family=Source+Code+Pro&family=Source+Sans+Pro&family=Special+Elite&family=Staatliches&family=Teko&family=Titillium+Web&family=Ubuntu&family=Ultra&family=Yanone+Kaffeesatz&display=swap" rel="stylesheet" />
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
