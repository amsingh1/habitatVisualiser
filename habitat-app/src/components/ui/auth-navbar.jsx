'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

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
              <div className="flex items-center space-x-4">
                {session.user.image ? (
                  <div className="h-8 w-8 relative">
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'Profile'}
                      fill
                      className="rounded-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-600">
                      {session.user.name ? session.user.name[0] : session.user.email[0]}
                    </span>
                  </div>
                )}
                <span className="text-white hidden md:inline">
                  {session.user.name || session.user.email}
                </span>
                <Link
                  href="/protected/dashboard"
                  className="inline-block bg-indigo-500 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75"
                >
                  Dashboard
                </Link>
                <Link
                  href="/habitats"
                  className="inline-block bg-indigo-500 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75"
                >
                  All Habitats
                </Link>
                <Link
                  href="/my-images"
                  className="inline-block bg-indigo-500 py-2 px-4 border border-transparent rounded-md text-base font-medium text-white hover:bg-opacity-75"
                >
                  My Habitats
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="inline-block bg-white py-2 px-4 border border-transparent rounded-md text-base font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}