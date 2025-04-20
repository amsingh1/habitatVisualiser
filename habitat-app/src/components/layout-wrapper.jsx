'use client';

import AuthNavBar from './ui/auth-navbar';
import { useSession } from 'next-auth/react';
import ImageSlider from '@/components/ImageSlider';
export default function LayoutWrapper({ children }) {

   const { data: session, status } = useSession();
    const loading = status === 'loading';
  
    if (loading) {
      return <div className="text-center py-4">Loading...</div>;
    }
  return (
    <>
      <AuthNavBar />
      {!session && <ImageSlider />}
  
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}