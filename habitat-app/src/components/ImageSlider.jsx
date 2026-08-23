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
  if (isLoading) return <div className="w-full h-64 bg-stone-200 animate-pulse"></div>;
  if (error) return <div className="text-red-500">Failed to load images</div>;
  if (!data?.sliderImages?.length) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + data.sliderImages.length) % data.sliderImages.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % data.sliderImages.length);
  };

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
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-emerald-950/80 via-emerald-950/20 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full text-white p-4 sm:p-6">
            <h3 className="text-lg font-semibold">{image.habitatName || 'Beautiful vegetation type'}</h3>
            {image.location && <p className="text-sm text-stone-200">{image.location}</p>}
          </div>
        </div>
      ))}

      {data.sliderImages.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/85 text-stone-800 flex items-center justify-center hover:bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button
            onClick={goToNext}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/85 text-stone-800 flex items-center justify-center hover:bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </>
      )}

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