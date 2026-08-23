import './globals.css';
import { Manrope, Public_Sans } from 'next/font/google';
import { AuthProvider } from '@/components/auth-provider';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  title: 'Vegetation Types',
  description: 'Explore and document European vegetation and habitat types.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.variable} ${publicSans.variable}`}>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}