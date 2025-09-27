'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (...args) => fetch(...args).then(res => res.json());

export default function ImageSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Fetch slider images
  const { data, error, isLoading } = useSWR('/api/habitats?slider=true&limit=5', fetcher);
  
  // Auto-advance slides every 5 seconds
  useEffect(() => {
    if (!data?.sliderImages?.length) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % data.sliderImages.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [data]);
  
  // Handle errors and loading states
  if (isLoading) return <div className="w-full h-64 bg-gray-200 animate-pulse"></div>;
  if (error) return <div className="text-red-500">Failed to load images</div>;
  if (!data?.sliderImages?.length) return null;
  
  return (
    <div className="relative w-full h-64 md:h-96 overflow-hidden">
      {data.sliderImages.map((image, index) => (
        <div 
          key={index}
          className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img 
            src={image.imageUrl[0]} // Assuming imageUrl is an array and we want the first one 
            alt={image.habitatName || 'Vegetation type image'} 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-50 text-white p-2">
            <h3 className="text-lg font-semibold">{image.habitatName || 'Beautiful vegetation type'}</h3>
            {image.location && <p className="text-sm">{image.location}</p>}
          </div>
        </div>
      ))}
      
      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {data.sliderImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full ${
              index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}