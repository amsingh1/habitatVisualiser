'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import HabitatList from '@/components/habitat/HabitatList';
import HabitatMap from '@/components/habitat/HabitatMap';
import SearchHabitatComponent from '@/components/SearchHabitatComponent';

export default function HabitatsClient() {
  const { data: session, status } = useSession();
  const [habitats, setHabitats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Fetch habitats when component mounts
  useEffect(() => {
    const fetchHabitats = async () => {
      if (status === 'loading') return;
      
      if (!session) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch('/api/habitats');
        const data = await response.json();
        
        if (response.ok) {
          setHabitats(data.habitats || []);
        } else {
          throw new Error(data.message || 'Failed to fetch habitats');
        }
      } catch (error) {
        console.error('Error fetching habitats:', error);
        setError(error.message || 'An error occurred while fetching habitats');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHabitats();
  }, [session, status]);


  if (status === 'loading') {
    return <div className="py-10 text-center">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="py-10 text-center">
        <p className="text-xl">Please login to view and upload habitats</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-stone-900">Explore vegetation types</h1>
        <p className="mt-1 text-sm text-stone-600">Browse all recorded vegetation types, mapped by location.</p>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 mb-6">
        <SearchHabitatComponent context="habitats" />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-10 text-center">Loading habitats...</div>
      )}

      {!loading && !showUploadForm && (
        <div className="space-y-6">
          <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
            <HabitatMap  />
          </div>
          <div>
            <HabitatList />
          </div>
        </div>
      )}
    </div>
  );
}