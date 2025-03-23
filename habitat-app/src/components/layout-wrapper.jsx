'use client';

import AuthNavBar from './ui/auth-navbar';

export default function LayoutWrapper({ children }) {
  return (
    <>
      <AuthNavBar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}