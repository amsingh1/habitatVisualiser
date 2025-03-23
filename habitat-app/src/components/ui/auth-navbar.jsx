'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function AuthNavBar() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  return (
    <header className="bg-indigo-600">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="w-full py-6 flex items-center justify-between border-b border-indigo-500 lg:border-none">
          <div className="flex items-center">
            <Link href="/" className="text-white text-xl font-bold">
              Amazing Habitats
            </Link>
          </div>
          <div className="ml-10 space-x-4">
            {loading && (
              <span className="text-white">Loading...</span>
            )}
            
            {!loading && !session && (
              <>
                <Link
                  href="/auth/signin"
                  className="inline-block bg-indigo-500 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-block bg-white py-2 px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Sign up
                </Link>
              </>
            )}
            
            {!loading && session && (
              <>
                <span className="text-white">
                  Hello, {session.user.name || session.user.email}
                </span>
                <Link
                  href="/protected/dashboard"
                  className="inline-block bg-indigo-500 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75"
                >
                  Dashboard
                </Link>
                <Link
                  href="/habitats"
                  className="inline-block bg-indigo-500 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75 mr-2"
                >
                  Habitats
                </Link>
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                  className="inline-block bg-white py-2 px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}