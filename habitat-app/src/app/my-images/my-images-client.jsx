'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import HabitatList from '@/components/habitat/HabitatList';
import Link from 'next/link';

export default function MyImagesClient() {
  const { data: session, status } = useSession();
  const [habitats, setHabitats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch user's habitats when component mounts
  useEffect(() => {
    const fetchUserHabitats = async () => {
      if (status === 'loading') return;
      
      if (!session) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch('/api/habitats/my');
        const data = await response.json();
        
        if (response.ok) {
          setHabitats(data.habitats || []);
        } else {
          throw new Error(data.message || 'Failed to fetch your habitats');
        }
      } catch (error) {
        console.error('Error fetching user habitats:', error);
        setError(error.message || 'An error occurred while fetching your habitats');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserHabitats();
  }, [session, status]);

  // Display user profile section
  const renderUserProfile = () => {
    if (!session || !session.user) return null;

    return (
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center">
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || 'Profile'}
              width={80}
              height={80}
              className="rounded-full mr-4"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-indigo-200 flex items-center justify-center mr-4">
              <span className="text-2xl text-indigo-600">
                {session.user.name ? session.user.name[0] : session.user.email[0]}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold">{session.user.name || 'User'}</h2>
            <p className="text-gray-600">{session.user.email}</p>
            <p className="text-gray-500 mt-1">
              {habitats.length} {habitats.length === 1 ? 'habitat' : 'habitats'} uploaded
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (status === 'loading') {
    return <div className="py-10 text-center">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="py-10 text-center">
        <p className="text-xl">Please sign in to view your uploaded images</p>
        <div className="mt-6">
          <Link
            href="/auth/signin"
            className="px-5 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderUserProfile()}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center">Loading your habitats...</div>
      ) : (
        <>
          {habitats.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-4">You haven't uploaded any habitat images yet.</p>
              <Link
                href="/habitats"
                className="px-5 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Upload Your First Habitat
              </Link>
            </div>
          ) : (
            <HabitatList dataType = "personal" />
          )}
        </>
      )}
    </div>
  );
}