'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function HomeClient() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="w-full">
        
        <div className="text-center">
          <p className="text-xl">Login to access all features</p>
          {/* <div className="mt-6 flex justify-center space-x-6">
            <Link
              href="/auth/signin"
              className="px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="px-5 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Sign up
            </Link>
          </div> */}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-xl">You are signed in!</p>
      <div className="mt-6 max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden md:max-w-2xl">
        <div className="md:flex">
          <div className="p-8 w-full">
            <div className="flex items-center justify-center">
              {session.user.image ? (
                <img
                  className="h-30 w-30 rounded-full"
                  src={session.user.image}
                  alt={session.user.name || 'Profile'}
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-indigo-200 flex items-center justify-center">
                  <span className="text-2xl text-indigo-600">
                    {session.user.name ? session.user.name[0] : session.user.email[0]}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <h2 className="text-xl font-bold text-gray-900">
                {session.user.name || 'User'}
              </h2>
              <p className="text-gray-500">{session.user.email}</p>
              <div className="mt-4">
                <Link
                  href="/habitats"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Explore
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}