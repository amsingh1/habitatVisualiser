'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function HabitatList({ habitats }) {
  const [selectedHabitat, setSelectedHabitat] = useState(null);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const openDetails = (habitat) => {
    setSelectedHabitat(habitat);
  };

  const closeDetails = () => {
    setSelectedHabitat(null);
  };

  if (habitats.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No habitat entries found. Upload your first one!</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habitats.map((habitat) => (
          <div 
            key={habitat._id}
            onClick={() => openDetails(habitat)}
            className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="relative h-48 w-full">
              <Image
                src={habitat.imageUrl}
                alt={habitat.habitatName}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold">{habitat.habitatName}</h3>
              <p className="text-gray-600">{habitat.location}</p>
              <p className="text-gray-500 text-sm">{formatDate(habitat.date)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for habitat details */}
      {selectedHabitat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">{selectedHabitat.habitatName}</h2>
                <button
                  onClick={closeDetails}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div className="relative h-80 w-full mb-4">
                <Image
                  src={selectedHabitat.imageUrl}
                  alt={selectedHabitat.habitatName}
                  fill
                  className="object-contain"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Location</h3>
                  <p className="mt-1">{selectedHabitat.location}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Date</h3>
                  <p className="mt-1">{formatDate(selectedHabitat.date)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Uploaded by</h3>
                  <p className="mt-1">{selectedHabitat.userName || selectedHabitat.userEmail}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Upload Date</h3>
                  <p className="mt-1">{formatDate(selectedHabitat.createdAt)}</p>
                </div>
              </div>

              {selectedHabitat.notes && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                  <p className="mt-1 whitespace-pre-line">{selectedHabitat.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}