import './globals.css';
import { AuthProvider } from '@/components/auth-provider';

export const metadata = {
  title: 'Authentication App',
  description: 'Next.js application with authentication',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}