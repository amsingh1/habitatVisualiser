'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function HabitatList({ habitats }) {
  const [selectedHabitat, setSelectedHabitat] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const openDetails = (habitat) => {
    setSelectedHabitat(habitat);
    setCurrentImageIndex(0);
  };

  const closeDetails = () => {
    setSelectedHabitat(null);
    setCurrentImageIndex(0);
  };

  const goToNextImage = () => {
    if (selectedHabitat) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === selectedHabitat.imageUrl.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const goToPrevImage = () => {
    if (selectedHabitat) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? selectedHabitat.imageUrl.length - 1 : prevIndex - 1
      );
    }
  };

  const goToImage = (index) => {
    setCurrentImageIndex(index);
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
            className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300"
          >
            {/* Show just the first image prominent in the card */}
            <div className="relative h-48 w-full overflow-hidden">
              {habitat.imageUrl.length > 0 && (
                <Image
                  src={habitat.imageUrl[0]}
                  alt={`${habitat.habitatName}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
              )}
              {habitat.imageUrl.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded-full text-xs">
                  +{habitat.imageUrl.length - 1} more
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold">{habitat.habitatName}</h3>
              <p className="text-gray-600">{habitat.location}</p>
              <p className="text-gray-500 text-sm">{formatDate(habitat.date)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal with image slider/carousel */}
      {selectedHabitat && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="relative">
              {/* Main image carousel */}
              <div className="relative h-[80vh] w-full">
                <Image
                  src={selectedHabitat.imageUrl[currentImageIndex]}
                  alt={`${selectedHabitat.habitatName} - Image ${currentImageIndex + 1}`}
                  fill
                  className="object-cover"
                  priority
                />
                
                {/* Navigation arrows - now more translucent */}
                {selectedHabitat.imageUrl.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); goToPrevImage(); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-20 text-white p-2 rounded-full hover:bg-opacity-40 transition-opacity"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 19l-7-7 7-7"></path>
                      </svg>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); goToNextImage(); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-20 text-white p-2 rounded-full hover:bg-opacity-40 transition-opacity"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </button>
                  </>
                )}
                
                {/* Image counter - more subtle */}
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-30 text-white px-2 py-0.5 rounded-full text-xs">
                  {currentImageIndex + 1} / {selectedHabitat.imageUrl.length}
                </div>
                
                {/* Close button - more subtle */}
                <button
                  onClick={(e) => { e.stopPropagation(); closeDetails(); }}
                  className="absolute top-4 right-4 bg-black bg-opacity-30 text-white p-1.5 rounded-full hover:bg-opacity-50 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              {/* Thumbnail strip */}
              {selectedHabitat.imageUrl.length > 1 && (
                <div className="bg-gray-100 p-2 flex overflow-x-auto">
                  {selectedHabitat.imageUrl.map((url, index) => (
                    <div 
                      key={index} 
                      onClick={(e) => { e.stopPropagation(); goToImage(index); }}
                      className={`relative h-16 w-16 flex-shrink-0 mx-1 cursor-pointer ${
                        currentImageIndex === index 
                          ? 'ring-2 ring-blue-500' 
                          : 'hover:opacity-80'
                      }`}
                    >
                      <Image
                        src={url}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Content section */}
          </div>
        </div>
      )}
    </div>
  );
}