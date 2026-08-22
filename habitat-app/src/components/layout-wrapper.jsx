'use client';

import AuthNavBar from './ui/auth-navbar';
import Footer from './ui/footer';
import { useSession } from 'next-auth/react';
import ImageSlider from '@/components/ImageSlider';
export default function LayoutWrapper({ children }) {

   const { data: session, status } = useSession();
    const loading = status === 'loading';

    if (loading) {
      return <div className="text-center py-4">Loading...</div>;
    }
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <AuthNavBar />
      {!session && <ImageSlider />}

      <main className="flex-1 w-full max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      <Footer />
    </div>
  );
}