'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import HabitatUpload from '@/components/habitat/HabitatUpload';
import HabitatList from '@/components/habitat/HabitatList';
import HabitatMap from '@/components/habitat/HabitatMap';

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

  const toggleUploadForm = () => {
    setShowUploadForm(!showUploadForm);
  };

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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Your Habitat Entries</h2>
        <button
          onClick={toggleUploadForm}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {showUploadForm ? 'Hide Upload Form' : 'Upload New Habitat'}
        </button>
      </div>

      {showUploadForm && <HabitatUpload />}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="py-10 text-center">Loading habitats...</div>
      ) : (
        <div className="space-y-6"> {/* Add spacing between components */}
        <div className="border rounded-lg">
          <HabitatMap habitats={habitats} />
        </div>
        <div>
          <HabitatList habitats={habitats} />
        </div>
      </div>
      )}
    </div>
  );
}